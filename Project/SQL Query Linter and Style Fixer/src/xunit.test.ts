import { describe, it, expect } from "vitest";

// Simple custom XML generator/validator function that resembles XUnit/JUnit reporters
function compileXUnitReport(testSuiteName: string, tests: Array<{ name: string; classname: string; time: number; failure?: string }>) {
  const total = tests.length;
  const failures = tests.filter(t => t.failure).length;
  const time = tests.reduce((acc, t) => acc + t.time, 0).toFixed(3);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites tests="${total}" failures="${failures}" errors="0" time="${time}">\n`;
  xml += `  <testsuite name="${testSuiteName}" tests="${total}" failures="${failures}" errors="0" time="${time}">\n`;
  
  for (const t of tests) {
    xml += `    <testcase name="${t.name}" classname="${t.classname}" time="${t.time.toFixed(3)}">\n`;
    if (t.failure) {
      xml += `      <failure message="Assertion Error">${t.failure}</failure>\n`;
    }
    xml += `    </testcase>\n`;
  }
  
  xml += `  </testsuite>\n`;
  xml += `</testsuites>`;
  return xml;
}

describe("SentrySQL - XUnit Integration & XML Formatting Tests", () => {
  it("should generate standard-compliant XUnit XML tag outputs", () => {
    const report = compileXUnitReport("SentrySQL_Suite", [
      { name: "test_jwt_handshake", classname: "AuthEngine", time: 0.012 },
      { name: "test_sql_obfuscation", classname: "CipherEngine", time: 0.045 }
    ]);

    expect(report).toContain("<?xml");
    expect(report).toContain("<testsuites tests=\"2\" failures=\"0\"");
    expect(report).toContain("<testcase name=\"test_jwt_handshake\" classname=\"AuthEngine\"");
    expect(report).not.toContain("<failure");
  });

  it("should output failure tags correctly when assert fails in a testcase", () => {
    const report = compileXUnitReport("SentrySQL_Fail_Suite", [
      { name: "test_unauthorized_drop", classname: "SecurityEngine", time: 0.005, failure: "Expected risk rating High Risk but received Low" }
    ]);

    expect(report).toContain("<failure message=\"Assertion Error\">Expected risk rating High Risk but received Low</failure>");
    expect(report).toContain("failures=\"1\"");
  });

  it("should sum up individual test execution times correctly inside the parent testsuite tag", () => {
    const report = compileXUnitReport("SentrySQL_Performance", [
      { name: "test_1", classname: "Speed", time: 0.200 },
      { name: "test_2", classname: "Speed", time: 0.150 }
    ]);
    
    expect(report).toContain("time=\"0.350\"");
  });
});
