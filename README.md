# 🧠 GraphQL Employee Management API

A backend GraphQL API built with Node.js to manage employee records, supporting advanced querying, filtering, pagination, and **role-based access control** (admin vs employee).

---

## ✨ Features

- 🚀 **GraphQL API** for managing employee data
- 📚 **Data Model** includes:
  - `id`, `name`, `age`, `class`, `subjects[]`, `attendance`
- 🔍 **GraphQL Queries**:
  - List all employees (with optional filters)
  - Get employee by ID
  - Paginate and sort employee list
- ✏️ **GraphQL Mutations**:
  - Add new employee
  - Update existing employee
- 🔐 **Authentication & Authorization**:
  - Role-based access control (Admin / Employee)
  - Certain actions restricted by role

---

## 🖼️ Screenshots
![updateemployee](https://github.com/user-attachments/assets/bef033c6-ef5d-40bc-8091-cde3a9eed7c7)
![login](https://github.com/user-attachments/assets/4edd1e07-e66f-4e7d-8f9c-1a8695e1e83a)
![addemployee](https://github.com/user-attachments/assets/495cdaf9-5d01-4284-bbcf-025ddc6f9b9e)
![listemployeeiwhtfiler](https://github.com/user-attachments/assets/59519592-617b-49ca-8fcc-872ce1b8df1d)


### 📌 Sample GraphQL Playground

> Make sure your app is running and visit: `http://localhost:4000/graphql`


---

## 🛠️ Tech Stack

- **Node.js**
- **Express.js / Apollo Server**
- **GraphQL**
- **MongoDB (with Mongoose or Prisma)**
- **JWT for Auth**
- **Role-based Middleware**

---

## 🚀 Getting Started

### 🔧 Prerequisites

- Node.js (v18+ recommended)
- MongoDB instance (local or cloud)
- npm or yarn

---

### 📦 Installation

```bash
git clone [git@github.com:avipuri2019/employee-api-graphql.git](https://github.com/avipuri2019/employee-api-graphql.git)
cd employee-api-graphql
npm install
npm run dev
