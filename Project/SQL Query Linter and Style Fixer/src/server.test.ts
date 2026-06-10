import { describe, it, expect } from "vitest";
import { 
  encryptSQL, 
  decryptSQL, 
  serverToSnakeCase, 
  generateToken, 
  verifyToken, 
  runSqlSecurityCheck 
} from "../server";

describe("SentrySQL Core Code - Cryptographic Operations", () => {
  it("should encrypt and decrypt SQL statements securely", () => {
    const rawSQL = "SELECT id, ssn, credit_card FROM customers WHERE status = 'Active';";
    const encrypted = encryptSQL(rawSQL);
    
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(rawSQL);
    expect(typeof encrypted).toBe("string");

    const decrypted = decryptSQL(encrypted);
    expect(decrypted).toBe(rawSQL);
  });

  it("should handle empty or whitespace-only SQL values correctly", () => {
    const emptyStr = "";
    const encrypted = encryptSQL(emptyStr);
    const decrypted = decryptSQL(encrypted);
    expect(decrypted).toBe(emptyStr);
  });
});

describe("SentrySQL Core Code - DB Identifier Formatting", () => {
  it("should translate typical CamelCase identifiers to lowercase snake_case standard", () => {
    expect(serverToSnakeCase("userId")).toBe("user_id");
    expect(serverToSnakeCase("customerName")).toBe("customer_name");
    expect(serverToSnakeCase("employeeSalaryDetails")).toBe("employee_salary_details");
  });

  it("should convert standalone uppercase abbreviation suffixes properly", () => {
    expect(serverToSnakeCase("userID")).toBe("user_id");
    expect(serverToSnakeCase("accountId")).toBe("account_id");
  });

  it("should output clean values for strings that are already snake_case", () => {
    expect(serverToSnakeCase("already_snake_case")).toBe("already_snake_case");
    expect(serverToSnakeCase("status")).toBe("status");
  });
});

describe("SentrySQL Core Code - JSON Web Tokens (SSO Simulation)", () => {
  it("should generate a valid HS256-like corporate JWT session token", () => {
    const userPayload = { email: "developer@company.com", role: "Developer" as const };
    const token = generateToken(userPayload);

    expect(token).toBeDefined();
    expect(token.split(".").length).toBe(3);
  });

  it("should decode and verify authentic active session tokens successfully", () => {
    const userPayload = { email: "admin@company.com", role: "Admin" as const };
    const token = generateToken(userPayload);
    const decoded = verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded.email).toBe(userPayload.email);
    expect(decoded.role).toBe(userPayload.role);
  });

  it("should refuse signature for forged or tampered session tokens", () => {
    const userPayload = { email: "developer@company.com", role: "Developer" as const };
    const token = generateToken(userPayload);
    
    // Sabotage signature part of verification
    const tamperedToken = token + "sabotage";
    const decoded = verifyToken(tamperedToken);

    expect(decoded).toBeNull();
  });
});

describe("SentrySQL Core Code - Threat Detection & Query Scanner Engine", () => {
  it("should flag typical destructive database DROP statement as High Risk", () => {
    const destructiveQuery = "DROP TABLE metadata_records;";
    const assessment = runSqlSecurityCheck(destructiveQuery);

    expect(assessment.risk).toBe("High Risk");
    expect(assessment.score).toBeLessThan(100);
    expect(assessment.findings.some(f => f.rule.includes("DROP"))).toBe(true);
  });

  it("should identify unqualified complete row purge statement as High Risk", () => {
    const dangerousQuery = "DELETE FROM customer_index;";
    const assessment = runSqlSecurityCheck(dangerousQuery);

    expect(assessment.risk).toBe("High Risk");
    expect(assessment.score).toBeLessThan(100);
    expect(assessment.findings.some(f => f.rule.includes("DELETE"))).toBe(true);
  });

  it("should classify traditional logical tautology SQL inject (1=1 Bypass) as Medium Risk", () => {
    const injectedQuery = "SELECT * FROM administrators WHERE username = 'admin' OR 1=1;";
    const assessment = runSqlSecurityCheck(injectedQuery);

    expect(assessment.risk).toBe("Medium Risk");
    expect(assessment.score).toBeLessThan(100);
    expect(assessment.findings.some(f => f.rule.includes("OR 1=1"))).toBe(true);
  });

  it("should recognize credit_card, phone, email, and password as sensitive customer identifiers", () => {
    const query = "SELECT customer_name, ssn, email, phone, password FROM audit_users;";
    const assessment = runSqlSecurityCheck(query);

    expect(assessment.sensitiveData.length).toBeGreaterThanOrEqual(4);
    
    const sensitiveFields = assessment.sensitiveData.map(d => d.field);
    expect(sensitiveFields).toContain("ssn");
    expect(sensitiveFields).toContain("email");
    expect(sensitiveFields).toContain("phone");
    expect(sensitiveFields).toContain("password");
  });

  it("should score safe, standards-compliant SQL query with full marks", () => {
    const safeQuery = "SELECT id, username, first_name FROM employee_directory WHERE division_id = 45;";
    const assessment = runSqlSecurityCheck(safeQuery);

    expect(assessment.risk).toBe("Low Risk");
    expect(assessment.score).toBe(100);
    expect(assessment.findings.length).toBe(0);
    expect(assessment.sensitiveData.length).toBe(0);
  });
});
