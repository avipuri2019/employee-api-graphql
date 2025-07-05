const gql = require("graphql-tag");

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Employee {
    id: ID!
    employeeId: String!
    name: String!
    age: Int!
    class: String!
    subjects: [String!]!
    attendance: [Attendance!]!
    department: String
    position: String
    salary: Float
    email: String!
    phone: String
    address: String
    dateOfJoining: String!
    isActive: Boolean!
    createdBy: User
    createdAt: String!
    updatedAt: String!
  }

  type Attendance {
    id: ID!
    date: String!
    status: AttendanceStatus!
    checkIn: String
    checkOut: String
    notes: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type EmployeeConnection {
    edges: [EmployeeEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type EmployeeEdge {
    node: Employee!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  enum Role {
    admin
    employee
  }

  enum AttendanceStatus {
    present
    absent
    late
    half_day
  }

  enum SortOrder {
    ASC
    DESC
  }

  enum EmployeeSortField {
    NAME
    AGE
    DATE_OF_JOINING
    CREATED_AT
  }

  input EmployeeFilter {
    name: String
    department: String
    class: String
    subjects: [String!]
    isActive: Boolean
    ageMin: Int
    ageMax: Int
  }

  input EmployeeSort {
    field: EmployeeSortField!
    order: SortOrder!
  }

  input EmployeeInput {
    employeeId: String!
    name: String!
    age: Int!
    class: String!
    subjects: [String!]!
    department: String
    position: String
    salary: Float
    email: String!
    phone: String
    address: String
  }

  input EmployeeUpdateInput {
    name: String
    age: Int
    class: String
    subjects: [String!]
    department: String
    position: String
    salary: Float
    email: String
    phone: String
    address: String
    isActive: Boolean
  }

  input AttendanceInput {
    employeeId: ID!
    date: String!
    status: AttendanceStatus!
    checkIn: String
    checkOut: String
    notes: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String!
    role: Role = employee
  }

  type Query {
    # Authentication
    me: User

    # Employee queries
    employees(
      filter: EmployeeFilter
      sort: EmployeeSort
      first: Int
      after: String
      last: Int
      before: String
    ): EmployeeConnection!

    employee(id: ID!): Employee

    # Attendance queries
    employeeAttendance(
      employeeId: ID!
      startDate: String
      endDate: String
    ): [Attendance!]!

    # Statistics (admin only)
    employeeStats: EmployeeStats
  }

  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!

    # Employee mutations
    createEmployee(input: EmployeeInput!): Employee!
    updateEmployee(id: ID!, input: EmployeeUpdateInput!): Employee!
    deleteEmployee(id: ID!): Boolean!

    # Attendance mutations
    addAttendance(input: AttendanceInput!): Employee!
    updateAttendance(
      employeeId: ID!
      attendanceId: ID!
      input: AttendanceInput!
    ): Employee!
  }

  type EmployeeStats {
    totalEmployees: Int!
    activeEmployees: Int!
    departmentStats: [DepartmentStat!]!
    attendanceStats: AttendanceStats!
  }

  type DepartmentStat {
    department: String!
    count: Int!
  }

  type AttendanceStats {
    presentToday: Int!
    absentToday: Int!
    lateToday: Int!
  }
`;

module.exports = typeDefs;
