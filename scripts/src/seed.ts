import { db } from "@workspace/db";
import { 
  usersTable, 
  schoolsTable, 
  sponsorsTable, 
  studentsTable, 
  sponsorshipsTable, 
  paymentsTable,
  guardiansTable 
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import fs from "fs";

function hashPassword(password: string): string {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? "12");
  return bcrypt.hashSync(password, rounds);
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  const minLength = 12;
  for (let i = 0; i < minLength; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateUniqueUsername(fullName: string, index: number): string {
  const firstName = fullName.split(" ")[0].toLowerCase();
  const lastName = fullName.split(" ")[1]?.toLowerCase() || fullName.toLowerCase();
  return `${firstName}.${lastName}${index > 0 ? index : ""}@ikodi.local`;
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  try {
    // Clear existing data (development only!)
    console.log("Clearing existing data...");
    await db.delete(paymentsTable);
    await db.delete(sponsorshipsTable);
    await db.delete(guardiansTable);
    await db.delete(studentsTable);
    await db.delete(sponsorsTable);
    await db.delete(schoolsTable);
    await db.delete(usersTable);

    // 1. Create Users with stable system credentials
    console.log("✓ Creating users with stable system credentials...");

    const userDefinitions = [
      { fullName: "System Administrator", email: "admin@ikodi.local", username: "admin@ikodi.local", password: "Admin@123456", role: "admin" as const },
      { fullName: "Program Officer", email: "program.officer@ikodi.local", username: "program.officer@ikodi.local", password: "Program@123456", role: "program_officer" as const },
      { fullName: "Finance Officer", email: "finance.officer@ikodi.local", username: "finance.officer@ikodi.local", password: "Finance@123456", role: "finance_officer" as const },
      { fullName: "Read Only Viewer", email: "viewer@ikodi.local", username: "viewer@ikodi.local", password: "Viewer@123456", role: "viewer" as const },
      { fullName: "Sponsor Portal User", email: "sponsorships@krcs.org", username: "sponsorships@krcs.org", password: "Sponsor@123456", role: "sponsor_portal" as const },
    ];

    const credentialsLog: Array<{ fullName: string; username: string; password: string; role: string; email: string }> = [];
    const userValues = userDefinitions.map((def) => {
      const passwordHash = hashPassword(def.password);
      credentialsLog.push({
        fullName: def.fullName,
        username: def.username,
        password: def.password,
        role: def.role,
        email: def.email,
      });
      return {
        username: def.username,
        passwordHash,
        fullName: def.fullName,
        email: def.email,
        role: def.role,
        isActive: true,
      };
    });

    const users = await db.insert(usersTable).values(userValues).returning();
    console.log(`  Created ${users.length} users`);

    // 2. Create Schools
    console.log("✓ Creating schools...");
    const schools = await db.insert(schoolsTable).values([
      {
        name: "St. Mary's Secondary School",
        category: "high_school",
        location: "Nairobi, Kenya",
        contactPhone: "+254712345678",
        contactEmail: "info@stmarys.ac.ke",
      },
      {
        name: "Kenyatta University",
        category: "university",
        location: "Nairobi, Kenya",
        contactPhone: "+254713456789",
        contactEmail: "admissions@ku.ac.ke",
      },
      {
        name: "Precious Talents Primary School",
        category: "primary_school",
        location: "Kisii, Kenya",
        contactPhone: "+254714567890",
        contactEmail: "info@precioustalents.sc.ke",
      },
      {
        name: "Mombasa Institute of Technology",
        category: "college",
        location: "Mombasa, Kenya",
        contactPhone: "+254715678901",
        contactEmail: "admissions@mit.ac.ke",
      },
      {
        name: "Nyeri Girls High School",
        category: "high_school",
        location: "Nyeri, Kenya",
        contactPhone: "+254716789012",
        contactEmail: "info@nyerigirls.ac.ke",
      },
    ]).returning();
    console.log(`  Created ${schools.length} schools`);

    // 3. Create Sponsors
    console.log("✓ Creating sponsors...");
    const sponsors = await db.insert(sponsorsTable).values([
      {
        name: "Kenya Red Cross Society",
        type: "organization",
        email: "sponsorships@krcs.org",
        phone: "+254702888888",
        address: "Red Cross Road, Nairobi",
        status: "active",
      },
      {
        name: "John Kipchoge Foundation",
        type: "organization",
        email: "grants@kipchoge-foundation.org",
        phone: "+254703999999",
        address: "Eldoret, Kenya",
        status: "active",
      },
      {
        name: "Jane Karua",
        type: "individual",
        email: "jane.karua@gmail.com",
        phone: "+254701111111",
        address: "Nairobi",
        status: "active",
      },
      {
        name: "Equity Group Foundation",
        type: "organization",
        email: "csr@equity.co.ke",
        phone: "+254704000000",
        address: "Equity Centre, Nairobi",
        status: "active",
      },
      {
        name: "Safaricom Foundation",
        type: "organization",
        email: "csr@safaricom.co.ke",
        phone: "+254705111111",
        address: "Safaricom Campus, Nairobi",
        status: "active",
      },
      {
        name: "Peter Mwangi",
        type: "individual",
        email: "peter.mwangi@business.com",
        phone: "+254706222222",
        address: "Nairobi",
        status: "active",
      },
      {
        name: "Tech Leaders Initiative",
        type: "organization",
        email: "education@techleaders.ke",
        phone: "+254707333333",
        address: "Westlands, Nairobi",
        status: "active",
      },
      {
        name: "Grace Wanja",
        type: "individual",
        email: "grace@gracefoundation.ke",
        phone: "+254708444444",
        address: "Kisii",
        status: "active",
      },
      {
        name: "African Leadership Foundation",
        type: "organization",
        email: "sponsorships@alfafrica.org",
        phone: "+254709555555",
        address: "Johannesburg Branch",
        status: "active",
      },
      {
        name: "Community Development Trust",
        type: "organization",
        email: "hello@cdtrust.org",
        phone: "+254710666666",
        address: "Mombasa",
        status: "active",
      },
    ]).returning();
    console.log(`  Created ${sponsors.length} sponsors`);

    // 4. Create Students
    console.log("✓ Creating students...");
    const firstNames = ["Alice", "Benjamin", "Christine", "David", "Emily", "Frank", "Grace", "Henry", "Ivy", "James", "Karen", "Leo", "Monica", "Nathan", "Olivia", "Patrick", "Quinn", "Rachel", "Samuel", "Tina"];
    const lastNames = ["Okonkwo", "Kipchoge", "Mwangi", "Njoroge", "Koech", "Kamau", "Mutua", "Nyambura", "Kariuki", "Gitau", "Wanjiru", "Kimani", "Cheruiyot", "Mutua", "Kiplagat", "Okech", "Achieng", "Musyoka", "Kipchoge", "Ouma"];
    
    const studentsData: Array<typeof studentsTable.$inferInsert> = [];
    for (let i = 0; i < 20; i++) {
      studentsData.push({
        admissionNumber: `ADM-2024-${String(i + 1).padStart(4, "0")}`,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[i % lastNames.length],
        dateOfBirth: toDateOnlyString(new Date(2000 + Math.floor(i / 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)),
        gender: (i % 2 === 0 ? "male" : "female") as "male" | "female",
        phone: `+254${71 + Math.floor(i / 2)}${String(i).padStart(7, "0")}`,
        email: `student${i + 1}@ikodi.local`,
        schoolId: schools[i % schools.length].id,
        course: i < 10 ? "Information Technology" : "Business Management",
        currentLevel: i < 10 ? "Year 2" : "Form 4",
        currentTerm: "Term 1 2024",
        totalFees: "150000.00",
        paidAmount: `${Math.floor(Math.random() * 100000)}.00`,
        status: "active" as const,
        sponsorshipStatus: "unsponsored" as const,
      });
    }
    const insertedStudents = await db.insert(studentsTable).values(studentsData).returning();
    console.log(`  Created ${insertedStudents.length} students`);

    // 5. Create Guardians for students
    console.log("✓ Creating guardians...");
    const guardiansData = insertedStudents.map((student: typeof studentsTable.$inferSelect, idx: number) => ({
      studentId: student.id,
      name: `Guardian of ${student.firstName}`,
      relationship: idx % 3 === 0 ? "parent" : idx % 3 === 1 ? "uncle" : "grandmother",
      phone: `+254${72 + Math.floor(idx / 5)}${String(idx).padStart(7, "0")}`,
      email: `guardian${idx + 1}@ikodi.local`,
    }));
    await db.insert(guardiansTable).values(guardiansData);
    console.log(`  Created ${guardiansData.length} guardians`);

    // 6. Create Sponsorships
    console.log("✓ Creating sponsorships...");
    const sponsorshipsData: Array<typeof sponsorshipsTable.$inferInsert> = [];
    for (let i = 0; i < 50; i++) {
      const sponsor = sponsors[i % sponsors.length];
      const student = insertedStudents[i % insertedStudents.length];
      sponsorshipsData.push({
        studentId: student.id,
        sponsorId: sponsor.id,
        coverageType: (i % 3 === 0 ? "partial" : "full") as "partial" | "full",
        amount: i % 3 === 0 ? "50000.00" : "75000.00",
        startDate: toDateOnlyString(new Date(2024, 0, 1)),
        endDate: toDateOnlyString(new Date(2025, 11, 31)),
        status: "active" as const,
        term: "Term 1 2024",
        notes: `Sponsorship for ${student.firstName} ${student.lastName}`,
      });
    }
    const insertedSponsorships = await db.insert(sponsorshipsTable).values(sponsorshipsData).returning();
    console.log(`  Created ${insertedSponsorships.length} sponsorships`);

    // 7. Create Payments
    console.log("✓ Creating payments...");
    const paymentsData: Array<typeof paymentsTable.$inferInsert> = [];
    for (let i = 0; i < 50; i++) {
      const sponsorship = insertedSponsorships[i % insertedSponsorships.length];
      const paymentMethods = ["mpesa", "bank_transfer", "cash", "cheque", "online"];
      paymentsData.push({
        sponsorshipId: sponsorship.id,
        sponsorId: sponsorship.sponsorId,
        studentId: sponsorship.studentId,
        amount: sponsorship.amount,
        paymentDate: toDateOnlyString(new Date(2024, Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1)),
        paymentMethod: paymentMethods[i % paymentMethods.length] as "mpesa" | "bank_transfer" | "cash" | "cheque" | "online",
        referenceNumber: `REF-${Date.now()}-${i}`,
        purpose: "Tuition fees payment",
        term: "Term 1 2024",
        notes: "Payment received and processed",
      });
    }
    const insertedPayments = await db.insert(paymentsTable).values(paymentsData).returning();
    console.log(`  Created ${insertedPayments.length} payments`);

    console.log("\n✅ Seeding completed successfully!\n");
    console.log("📊 Summary:");
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Schools: ${schools.length}`);
    console.log(`  • Sponsors: ${sponsors.length}`);
    console.log(`  • Students: ${insertedStudents.length}`);
    console.log(`  • Sponsorships: ${insertedSponsorships.length}`);
    console.log(`  • Payments: ${insertedPayments.length}`);
    
    console.log("\n🔐 SYSTEM-GENERATED LOGIN CREDENTIALS:");
    console.log("═══════════════════════════════════════════════════════════════");
    credentialsLog.forEach((cred, idx) => {
      console.log(`\n${idx + 1}. ${cred.fullName.toUpperCase()} (${cred.role})`);
      console.log(`   Email: ${cred.email}`);
      console.log(`   Username: ${cred.username}`);
      console.log(`   Password: ${cred.password}`);
    });
    console.log("\n═══════════════════════════════════════════════════════════════");
    
    // Save credentials to file
    const credentialsList = credentialsLog.map((cred, idx) => 
      `${idx + 1}. ${cred.fullName}\n   Role: ${cred.role}\n   Email: ${cred.email}\n   Username: ${cred.username}\n   Password: ${cred.password}\n`
    ).join("\n");
    
    const credentialsContent = `IKODI STUDENT SPONSORSHIP MANAGEMENT SYSTEM
SYSTEM-GENERATED LOGIN CREDENTIALS
Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${credentialsLog.map((cred, idx) => 
  `${idx + 1}. ${cred.fullName.toUpperCase()} (${cred.role})\n   Email: ${cred.email}\n   Username: ${cred.username}\n   Password: ${cred.password}`
).join("\n\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT SECURITY NOTES:
   • Save these credentials in a secure location
   • Share them securely with the respective users
   • Users should change their passwords on first login
   • Do NOT commit this file to version control

ACCESS CONTROL BY ROLE:
  • admin: Full access to all modules and user management
  • program_officer: Add/edit students and academic records; view sponsorships and payments
  • finance_officer: Record/view payments; view sponsorships and funding overview
  • viewer: Read-only access to records (no create/edit/delete)
  • sponsor_portal: View only own sponsored students and payment history

Generated: ${new Date().toISOString()}
`;
    
    const credentialsPath = "./SYSTEM_CREDENTIALS.txt";
    fs.writeFileSync(credentialsPath, credentialsContent, "utf-8");
    console.log(`\n📝 Credentials saved to: ${credentialsPath}`);
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
