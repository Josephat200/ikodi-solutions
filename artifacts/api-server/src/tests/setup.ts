import { beforeEach, afterEach, vi } from "vitest";
import { hashPassword } from "../lib/password";

// Mock database connection for testing
export const testDb = {
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

export const testUsers = {
  admin: {
    username: "admin@test.local",
    passwordHash: hashPassword("Admin@123456"),
    fullName: "Test Admin",
    email: "admin@test.local",
    role: "admin",
    isActive: true,
  },
  secretary: {
    username: "secretary@test.local",
    passwordHash: hashPassword("Secretary@123456"),
    fullName: "Test Secretary",
    email: "secretary@test.local",
    role: "secretary",
    isActive: true,
  },
};

export const testStudents = {
  student1: {
    admissionNumber: "ADM-2024-0001",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: new Date("2005-01-15"),
    gender: "male" as const,
    phone: "+254712345678",
    email: "john.doe@student.local",
    schoolId: 1,
    course: "Information Technology",
    currentLevel: "Year 2",
    currentTerm: "Term 1 2024",
    totalFees: "150000.00",
    paidAmount: "0",
    status: "active" as const,
    sponsorshipStatus: "unsponsored" as const,
  },
  student2: {
    admissionNumber: "ADM-2024-0002",
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: new Date("2005-03-20"),
    gender: "female" as const,
    phone: "+254712345679",
    email: "jane.smith@student.local",
    schoolId: 1,
    course: "Business Management",
    currentLevel: "Form 4",
    currentTerm: "Term 1 2024",
    totalFees: "120000.00",
    paidAmount: "0",
    status: "active" as const,
    sponsorshipStatus: "unsponsored" as const,
  },
};

export const testSponsors = {
  sponsor1: {
    name: "Red Cross Society",
    type: "organization" as const,
    email: "sponsor@redcross.org",
    phone: "+254702000000",
    address: "Nairobi, Kenya",
    status: "active" as const,
  },
  sponsor2: {
    name: "John Doe",
    type: "individual" as const,
    email: "john@example.com",
    phone: "+254712345690",
    address: "Nairobi, Kenya",
    status: "active" as const,
  },
};

export const testSponsorship = {
  sponsorship1: {
    studentId: 1,
    sponsorId: 1,
    coverageType: "full" as const,
    amount: "150000.00",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2025-12-31"),
    status: "active" as const,
    term: "Term 1 2024",
    notes: "Full sponsorship coverage",
  },
};

export const testPayment = {
  payment1: {
    sponsorshipId: 1,
    sponsorId: 1,
    studentId: 1,
    amount: "50000.00",
    paymentDate: new Date("2024-01-15"),
    paymentMethod: "mpesa" as const,
    referenceNumber: "REF-001-2024",
    purpose: "Tuition fees",
    term: "Term 1 2024",
    notes: "Payment received",
  },
};
