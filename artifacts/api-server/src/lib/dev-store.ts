export type DevSchool = {
  id: number;
  name: string;
  category: "primary_school" | "high_school" | "college" | "university";
  location: string;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: string;
};

export type DevSponsor = {
  id: number;
  name: string;
  type: "individual" | "organization";
  email: string | null;
  phone: string | null;
  address: string | null;
  status: "active" | "inactive";
  createdAt: string;
};

export type DevStudent = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  schoolId: number | null;
  course: string | null;
  currentLevel: string | null;
  currentTerm: string | null;
  totalFees: string | null;
  paidAmount: string | null;
  status: "active" | "inactive" | "graduated";
  sponsorshipStatus: "unsponsored" | "partial" | "sponsored";
  createdAt: string;
};

export type DevSponsorship = {
  id: number;
  studentId: number;
  sponsorId: number;
  coverageType: "full" | "partial";
  amount: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "inactive" | "completed";
  term: string | null;
  notes: string | null;
  createdAt: string;
};

export type DevPayment = {
  id: number;
  sponsorshipId: number | null;
  sponsorId: number | null;
  studentId: number | null;
  amount: string;
  paymentDate: string;
  paymentMethod: "mpesa" | "bank_transfer" | "cash" | "cheque" | "online";
  referenceNumber: string | null;
  purpose: string | null;
  term: string | null;
  notes: string | null;
  createdAt: string;
};

export type DevCommunication = {
  id: number;
  sentById: number | null;
  recipientType: "student" | "sponsor" | "guardian" | "all";
  recipientId: number | null;
  channel: "sms";
  subject: string | null;
  message: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  createdAt: string;
};

export const devState = {
  schools: [
    { id: 1, name: "St. Mary's Secondary School", category: "high_school", location: "Nairobi, Kenya", contactPhone: "+254712345678", contactEmail: "info@stmarys.ac.ke", createdAt: new Date().toISOString() },
    { id: 2, name: "Kenyatta University", category: "university", location: "Nairobi, Kenya", contactPhone: "+254713456789", contactEmail: "admissions@ku.ac.ke", createdAt: new Date().toISOString() },
    { id: 3, name: "Precious Talents Primary School", category: "primary_school", location: "Kisii, Kenya", contactPhone: "+254714567890", contactEmail: "info@precioustalents.sc.ke", createdAt: new Date().toISOString() },
    { id: 4, name: "Mombasa Institute of Technology", category: "college", location: "Mombasa, Kenya", contactPhone: "+254715678901", contactEmail: "admissions@mit.ac.ke", createdAt: new Date().toISOString() },
    { id: 5, name: "Nyeri Girls High School", category: "high_school", location: "Nyeri, Kenya", contactPhone: "+254716789012", contactEmail: "info@nyerigirls.ac.ke", createdAt: new Date().toISOString() },
  ] as DevSchool[],
  sponsors: [
    { id: 1, name: "Kenya Red Cross Society", type: "organization", email: "sponsorships@krcs.org", phone: "+254702888888", address: "Red Cross Road, Nairobi", status: "active", createdAt: new Date().toISOString() },
    { id: 2, name: "John Kipchoge Foundation", type: "organization", email: "grants@kipchoge-foundation.org", phone: "+254703999999", address: "Eldoret, Kenya", status: "active", createdAt: new Date().toISOString() },
    { id: 3, name: "Jane Karua", type: "individual", email: "jane.karua@gmail.com", phone: "+254701111111", address: "Nairobi", status: "active", createdAt: new Date().toISOString() },
    { id: 4, name: "Equity Group Foundation", type: "organization", email: "csr@equity.co.ke", phone: "+254704000000", address: "Equity Centre, Nairobi", status: "active", createdAt: new Date().toISOString() },
    { id: 5, name: "Safaricom Foundation", type: "organization", email: "csr@safaricom.co.ke", phone: "+254705111111", address: "Safaricom Campus, Nairobi", status: "active", createdAt: new Date().toISOString() },
  ] as DevSponsor[],
  students: [] as DevStudent[],
  sponsorships: [] as DevSponsorship[],
  payments: [] as DevPayment[],
  communications: [] as DevCommunication[],
  nextSchoolId: 6,
  nextSponsorId: 6,
  nextStudentId: 1,
  nextSponsorshipId: 1,
  nextPaymentId: 1,
  nextCommunicationId: 1,
  nextAdmissionNumber: 1000,
};

export function generateDevAdmissionNumber() {
  devState.nextAdmissionNumber += 1;
  return `IK-${new Date().getFullYear()}-${String(devState.nextAdmissionNumber).padStart(4, "0")}`;
}

export function getDevSchool(id: number | null | undefined) {
  if (id == null) return null;
  return devState.schools.find((school) => school.id === id) ?? null;
}

export function getDevSponsor(id: number | null | undefined) {
  if (id == null) return null;
  return devState.sponsors.find((sponsor) => sponsor.id === id) ?? null;
}

export function getDevStudent(id: number | null | undefined) {
  if (id == null) return null;
  return devState.students.find((student) => student.id === id) ?? null;
}
