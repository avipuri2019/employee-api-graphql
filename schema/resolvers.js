const jwt = require("jsonwebtoken");
const { GraphQLError } = require("graphql");
const User = require("../models/User");
const Employee = require("../models/Employee");

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
};

// Helper function to require authentication
const requireAuth = (user) => {
  if (!user) {
    throw new GraphQLError("You must be logged in to perform this action", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }
};

// Helper function to require admin role
const requireAdmin = (user) => {
  requireAuth(user);
  if (user.role !== "admin") {
    throw new GraphQLError("You must be an admin to perform this action", {
      extensions: {
        code: "FORBIDDEN",
      },
    });
  }
};

// Helper function to check if user can access employee data
const canAccessEmployee = (user, employee) => {
  requireAuth(user);
  if (user.role === "admin") return true;
  if (user.role === "employee" && employee.email === user.email) return true;
  throw new GraphQLError("You can only access your own employee data", {
    extensions: {
      code: "FORBIDDEN",
    },
  });
};

const resolvers = {
  Query: {
    me: async (parent, args, { user }) => {
      requireAuth(user);
      return user;
    },

    employees: async (
      parent,
      { filter, sort, first, after, last, before },
      { user }
    ) => {
      requireAuth(user);

      // Build filter query
      let query = {};
      if (filter) {
        if (filter.name) query.name = new RegExp(filter.name, "i");
        if (filter.department)
          query.department = new RegExp(filter.department, "i");
        if (filter.class) query.class = filter.class;
        if (filter.subjects) query.subjects = { $in: filter.subjects };
        if (filter.isActive !== undefined) query.isActive = filter.isActive;
        if (filter.ageMin || filter.ageMax) {
          query.age = {};
          if (filter.ageMin) query.age.$gte = filter.ageMin;
          if (filter.ageMax) query.age.$lte = filter.ageMax;
        }
      }

      // If user is employee, only show their own data
      if (user.role === "employee") {
        query.email = user.email;
      }

      // Build sort query
      let sortQuery = { createdAt: -1 };
      if (sort) {
        const sortField = sort.field.toLowerCase();
        const sortOrder = sort.order === "DESC" ? -1 : 1;
        sortQuery = { [sortField]: sortOrder };
      }

      // Pagination logic
      const limit = first || last || 10;
      const totalCount = await Employee.countDocuments(query);

      let employees;
      if (after) {
        const cursor = Buffer.from(after, "base64").toString("ascii");
        query._id = { $gt: cursor };
        employees = await Employee.find(query)
          .sort(sortQuery)
          .limit(limit)
          .populate("createdBy");
      } else if (before) {
        const cursor = Buffer.from(before, "base64").toString("ascii");
        query._id = { $lt: cursor };
        employees = await Employee.find(query)
          .sort(sortQuery)
          .limit(limit)
          .populate("createdBy");
      } else {
        employees = await Employee.find(query)
          .sort(sortQuery)
          .limit(limit)
          .populate("createdBy");
      }

      // Create edges
      const edges = employees.map((employee) => ({
        node: employee,
        cursor: Buffer.from(employee._id.toString()).toString("base64"),
      }));

      // Create page info
      const pageInfo = {
        hasNextPage: employees.length === limit && totalCount > limit,
        hasPreviousPage: !!after || !!before,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      };

      return {
        edges,
        pageInfo,
        totalCount,
      };
    },

    employee: async (parent, { id }, { user }) => {
      requireAuth(user);

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new UserInputError("Invalid employee ID format");
      }

      const employee = await Employee.findById(id).populate("createdBy");

      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      canAccessEmployee(user, employee);
      return employee;
    },

    employeeAttendance: async (
      parent,
      { employeeId, startDate, endDate },
      { user }
    ) => {
      requireAuth(user);
      const employee = await Employee.findById(employeeId);

      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      canAccessEmployee(user, employee);

      let attendanceFilter = {};
      if (startDate) attendanceFilter.date = { $gte: new Date(startDate) };
      if (endDate) {
        attendanceFilter.date = attendanceFilter.date || {};
        attendanceFilter.date.$lte = new Date(endDate);
      }

      return employee.attendance.filter((attendance) => {
        if (startDate && attendance.date < new Date(startDate)) return false;
        if (endDate && attendance.date > new Date(endDate)) return false;
        return true;
      });
    },

    employeeStats: async (parent, args, { user }) => {
      requireAdmin(user);

      const totalEmployees = await Employee.countDocuments();
      const activeEmployees = await Employee.countDocuments({ isActive: true });

      // Department statistics
      const departmentStats = await Employee.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $project: { department: "$_id", count: 1, _id: 0 } },
      ]);

      // Today's attendance statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendanceStats = await Employee.aggregate([
        { $unwind: "$attendance" },
        {
          $match: {
            "attendance.date": { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: "$attendance.status",
            count: { $sum: 1 },
          },
        },
      ]);

      const attendanceMap = {};
      attendanceStats.forEach((stat) => {
        attendanceMap[stat._id] = stat.count;
      });

      return {
        totalEmployees,
        activeEmployees,
        departmentStats,
        attendanceStats: {
          presentToday: attendanceMap.present || 0,
          absentToday: attendanceMap.absent || 0,
          lateToday: attendanceMap.late || 0,
        },
      };
    },
  },

  Mutation: {
    login: async (parent, { input }) => {
      const { email, password } = input;

      const user = await User.findOne({ email });
      if (!user) {
        throw new GraphQLError("Invalid email or password", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new GraphQLError("Invalid email or password", {
          extensions: {
            code: "UNAUTHENTICATED",
          },
        });
      }

      const token = generateToken(user._id);
      return { token, user };
    },

    register: async (parent, { input }) => {
      const { email, password, name, role } = input;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new UserInputError("User with this email already exists");
      }

      const user = new User({
        email,
        password,
        name,
        role: role || "employee",
      });

      await user.save();
      const token = generateToken(user._id);
      return { token, user };
    },

    createEmployee: async (parent, { input }, { user }) => {
      requireAdmin(user);

      const existingEmployee = await Employee.findOne({
        $or: [{ employeeId: input.employeeId }, { email: input.email }],
      });

      if (existingEmployee) {
        throw new UserInputError(
          "Employee with this ID or email already exists"
        );
      }

      const employee = new Employee({
        ...input,
        createdBy: user._id,
      });

      await employee.save();
      return await Employee.findById(employee._id).populate("createdBy");
    },

    updateEmployee: async (parent, { id, input }, { user }) => {
      requireAuth(user);

      const employee = await Employee.findById(id);
      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      // Employees can only update their own data, admins can update any
      if (user.role === "employee" && employee.email !== user.email) {
        throw new ForbiddenError("You can only update your own employee data");
      }

      // Check for duplicate email if updating email
      if (input.email && input.email !== employee.email) {
        const existingEmployee = await Employee.findOne({ email: input.email });
        if (existingEmployee) {
          throw new UserInputError("Employee with this email already exists");
        }
      }

      Object.assign(employee, input);
      await employee.save();
      return await Employee.findById(employee._id).populate("createdBy");
    },

    deleteEmployee: async (parent, { id }, { user }) => {
      requireAdmin(user);

      const employee = await Employee.findById(id);
      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      await Employee.findByIdAndDelete(id);
      return true;
    },

    addAttendance: async (parent, { input }, { user }) => {
      requireAuth(user);

      const employee = await Employee.findById(input.employeeId);
      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      canAccessEmployee(user, employee);

      const attendanceDate = new Date(input.date);
      const existingAttendance = employee.attendance.find(
        (att) => att.date.toDateString() === attendanceDate.toDateString()
      );

      if (existingAttendance) {
        throw new UserInputError("Attendance for this date already exists");
      }

      employee.attendance.push({
        date: attendanceDate,
        status: input.status,
        checkIn: input.checkIn ? new Date(input.checkIn) : null,
        checkOut: input.checkOut ? new Date(input.checkOut) : null,
        notes: input.notes,
      });

      await employee.save();
      return await Employee.findById(employee._id).populate("createdBy");
    },

    updateAttendance: async (
      parent,
      { employeeId, attendanceId, input },
      { user }
    ) => {
      requireAuth(user);

      const employee = await Employee.findById(employeeId);
      if (!employee) {
        throw new UserInputError("Employee not found");
      }

      canAccessEmployee(user, employee);

      const attendance = employee.attendance.id(attendanceId);
      if (!attendance) {
        throw new UserInputError("Attendance record not found");
      }

      Object.assign(attendance, {
        date: new Date(input.date),
        status: input.status,
        checkIn: input.checkIn ? new Date(input.checkIn) : null,
        checkOut: input.checkOut ? new Date(input.checkOut) : null,
        notes: input.notes,
      });

      await employee.save();
      return await Employee.findById(employee._id).populate("createdBy");
    },
  },
};

module.exports = resolvers;
