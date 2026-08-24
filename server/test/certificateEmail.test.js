import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  createCertificate,
  bulkCreateCertificates,
  updateCertificate,
  getCertificates,
  getCertificateById,
  sendCertificateEmailController,
  sendAllCertificateEmails,
  retryCertificateEmail,
  getCertificateEmailStatus
} from "../src/controllers/certificateController.js";
import { getEmailHealth } from "../src/controllers/emailController.js";
import Certificate from "../src/models/Certificate.js";
import { normalizeEmail } from "../src/utils/normalizeEmail.js";
import { isValidEmail } from "../src/utils/validateEmail.js";
import { isEmailConfigured, getEmailConfig } from "../src/config/email.js";
import {
  sendCertificateEmail,
  generateCertificateEmailContent,
  verifyEmailConnection
} from "../src/services/emailService.js";
import emailQueueService from "../src/services/emailQueueService.js";

const createResponse = () => ({
  body: undefined,
  statusCode: 200,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("email normalization trims, lowercases, and handles null/undefined safely", () => {
  assert.equal(normalizeEmail("  Student@PPSU.AC.IN  "), "student@ppsu.ac.in");
  assert.equal(normalizeEmail("John.Doe+Tag@Gmail.COM "), "john.doe+tag@gmail.com");
  assert.equal(normalizeEmail(null), "");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(""), "");
});

test("email validation correctly validates format and rejects invalid addresses", () => {
  assert.equal(isValidEmail("student@ppsu.ac.in"), true);
  assert.equal(isValidEmail("student@gmail.com"), true);
  assert.equal(isValidEmail("john.doe@subdomain.example.co"), true);
  assert.equal(isValidEmail("student@"), false);
  assert.equal(isValidEmail("abc"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail("student @ppsu.ac.in"), false);
  assert.equal(isValidEmail("@example.com"), false);
});

test("email configuration loads safely without credentials and does not crash", () => {
  const config = getEmailConfig();
  assert.equal(typeof config.provider, "string");
  assert.equal(typeof config.port, "number");
  assert.equal(typeof isEmailConfigured(), "boolean");
});

test("verifyEmailConnection and getEmailHealth return safe diagnostic without credentials", async () => {
  const result = await verifyEmailConnection();
  assert.equal(typeof result.configured, "boolean");
  assert.equal(typeof result.connected, "boolean");
  assert.equal(typeof result.message, "string");
  assert.equal(result.auth, undefined);
  assert.equal(result.password, undefined);

  const res = createResponse();
  await getEmailHealth({}, res);
  assert.equal(typeof res.statusCode, "number");
  assert.equal(typeof res.body.configured, "boolean");
  assert.equal(typeof res.body.connected, "boolean");
  assert.equal(res.body.pass, undefined);
});

test("sendCertificateEmail handles validation and unconfigured state safely", async () => {
  const emptyRes = await sendCertificateEmail({ to: "" });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.code, "EMAIL_REQUIRED");

  const invalidRes = await sendCertificateEmail({ to: "bad-email@" });
  assert.equal(invalidRes.success, false);
  assert.equal(invalidRes.code, "INVALID_EMAIL");

  if (!isEmailConfigured()) {
    const unconfiguredRes = await sendCertificateEmail({ to: "student@ppsu.ac.in" });
    assert.equal(unconfiguredRes.success, false);
    assert.equal(unconfiguredRes.code, "EMAIL_NOT_CONFIGURED");
  }
});

test("generateCertificateEmailContent personalizes content with certificate details", () => {
  const cert = {
    participantName: "Pritkumar Koradiya",
    eventName: "Hackathon 2026",
    certificateCategory: "Hackathon",
    organizationName: "PP Savani University",
    certificateTitle: "Certificate of Excellence"
  };

  const content = generateCertificateEmailContent(cert);
  assert.match(content.subject, /Certificate of Excellence/);
  assert.match(content.text, /Pritkumar Koradiya/);
  assert.match(content.text, /Hackathon 2026/);
  assert.match(content.text, /PP Savani University/);
  assert.match(content.html, /Pritkumar Koradiya/);
});

test("createCertificate validates email and accepts valid normalized email", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalCreate = Certificate.create;
  const originalFind = Certificate.find;
  let savedData = null;

  mongoose.connection.readyState = 1;
  Certificate.find = () => ({
    lean: async () => [{ certificateId: "CERT-2026-0001" }]
  });
  Certificate.create = async (data) => {
    savedData = data;
    return {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      toObject: () => ({ ...data })
    };
  };

  try {
    // 1. Invalid email rejected with 400
    const invalidRes = createResponse();
    await createCertificate(
      {
        body: {
          participantName: "Pritkumar Koradiya",
          organizationName: "PP Savani University",
          eventName: "Tech Summit",
          certificateCategory: "Seminar",
          certificateTitle: "Certificate of Participation",
          eventDate: "2026-08-24",
          templateStyle: "Classic Certificate",
          email: "invalid-email@"
        }
      },
      invalidRes
    );
    assert.equal(invalidRes.statusCode, 400);
    assert.equal(invalidRes.body.code, "INVALID_EMAIL");

    // 2. Valid email accepted and normalized
    const validRes = createResponse();
    await createCertificate(
      {
        body: {
          participantName: "Pritkumar Koradiya",
          organizationName: "PP Savani University",
          eventName: "Tech Summit",
          certificateCategory: "Seminar",
          certificateTitle: "Certificate of Participation",
          eventDate: "2026-08-24",
          templateStyle: "Classic Certificate",
          email: "  Student@PPSU.AC.IN  "
        }
      },
      validRes
    );
    assert.equal(validRes.statusCode, 201);
    assert.equal(savedData.recipientEmail, "student@ppsu.ac.in");
    assert.equal(savedData.emailStatus, "not-sent");
    assert.equal(savedData.emailSentAt, null);
    assert.equal(savedData.emailSendAttempts, 0);

    // 3. Absent email defaults to empty string without error
    const noEmailRes = createResponse();
    await createCertificate(
      {
        body: {
          participantName: "Kenil Dobariya",
          organizationName: "PP Savani University",
          eventName: "Tech Summit",
          certificateCategory: "Seminar",
          certificateTitle: "Certificate of Participation",
          eventDate: "2026-08-24",
          templateStyle: "Classic Certificate"
        }
      },
      noEmailRes
    );
    assert.equal(noEmailRes.statusCode, 201);
    assert.equal(savedData.recipientEmail, "");
    assert.equal(savedData.emailStatus, "not-sent");
  } finally {
    Certificate.create = originalCreate;
    Certificate.find = originalFind;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("bulkCreateCertificates handles email aliases, validation, and optional emails", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalInsertMany = Certificate.insertMany;
  const originalFind = Certificate.find;
  let savedCertificates = [];

  mongoose.connection.readyState = 1;
  Certificate.find = () => ({
    lean: async () => []
  });
  Certificate.insertMany = async (items) => {
    savedCertificates.push(...items);
    return items.map((item) => ({
      _id: new mongoose.Types.ObjectId(),
      ...item,
      toObject: () => ({ ...item })
    }));
  };

  try {
    // 1. Invalid email in participant throws validation error
    const invalidBulkRes = createResponse();
    await bulkCreateCertificates(
      {
        body: {
          commonDetails: {
            organizationName: "PP Savani University",
            eventName: "Hackathon 2026",
            certificateCategory: "Hackathon",
            certificateTitle: "Certificate of Participation",
            eventDate: "2026-08-24",
            templateStyle: "Classic Certificate"
          },
          participants: [
            { fullName: "Pritkumar Koradiya", emailAddress: "23se02ce053@ppsu.ac.in" },
            { name: "Rahul Patel", email: "bad@" }
          ]
        }
      },
      invalidBulkRes
    );
    assert.equal(invalidBulkRes.statusCode, 400);
    assert.match(invalidBulkRes.body.message, /Invalid email format/);

    // 2. Valid batch with mixed email and non-email participants
    savedCertificates = [];
    const validBulkRes = createResponse();
    await bulkCreateCertificates(
      {
        body: {
          commonDetails: {
            organizationName: "PP Savani University",
            eventName: "Hackathon 2026",
            certificateCategory: "Hackathon",
            certificateTitle: "Certificate of Participation",
            eventDate: "2026-08-24",
            templateStyle: "Classic Certificate"
          },
          participants: [
            { fullName: "Pritkumar Koradiya", emailAddress: "  23se02ce053@ppsu.ac.in  " },
            { name: "Kenil Dobariya" } // no email
          ]
        }
      },
      validBulkRes
    );
    assert.equal(validBulkRes.statusCode, 201);
    assert.equal(savedCertificates.length, 2);
    assert.equal(savedCertificates[0].participantName, "Pritkumar Koradiya");
    assert.equal(savedCertificates[0].recipientEmail, "23se02ce053@ppsu.ac.in");
    assert.equal(savedCertificates[0].emailStatus, "not-sent");
    assert.equal(savedCertificates[1].participantName, "Kenil Dobariya");
    assert.equal(savedCertificates[1].recipientEmail, "");
    assert.equal(savedCertificates[1].emailStatus, "not-sent");
  } finally {
    Certificate.insertMany = originalInsertMany;
    Certificate.find = originalFind;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("sendCertificateEmailController validates PDF attachment payload and recipient requirements", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindById = Certificate.findById;

  mongoose.connection.readyState = 1;
  const mockCertId = new mongoose.Types.ObjectId();

  try {
    // 1. Missing PDF rejected
    Certificate.findById = async () => ({
      _id: mockCertId,
      participantName: "Pritkumar Koradiya",
      recipientEmail: "student@ppsu.ac.in",
      certificateTitle: "Certificate of Participation",
      eventName: "Hackathon 2026",
      certificateCategory: "Hackathon",
      organizationName: "PP Savani University",
      save: async () => {}
    });

    const noPdfRes = createResponse();
    await sendCertificateEmailController(
      { params: { id: mockCertId.toString() }, body: {} },
      noPdfRes
    );
    assert.equal(noPdfRes.statusCode, 400);
    assert.equal(noPdfRes.body.code, "PDF_REQUIRED");

    // 2. Invalid non-PDF data rejected
    const invalidPdfRes = createResponse();
    await sendCertificateEmailController(
      {
        params: { id: mockCertId.toString() },
        body: { pdfBase64: "data:text/plain;base64,aGVsbG8gd29ybGQ=" }
      },
      invalidPdfRes
    );
    assert.equal(invalidPdfRes.statusCode, 400);
    assert.equal(invalidPdfRes.body.code, "INVALID_PDF");

    // 3. Certificate missing recipient email rejected
    Certificate.findById = async () => ({
      _id: mockCertId,
      participantName: "Kenil Dobariya",
      recipientEmail: "",
      save: async () => {}
    });

    const noEmailRes = createResponse();
    const validDummyPdf = Buffer.from("%PDF-1.4 sample pdf content").toString("base64");
    await sendCertificateEmailController(
      {
        params: { id: mockCertId.toString() },
        body: { pdfBase64: validDummyPdf, fileName: "Kenil.pdf" }
      },
      noEmailRes
    );
    assert.equal(noEmailRes.statusCode, 400);
    assert.equal(noEmailRes.body.code, "EMAIL_REQUIRED");

    // 4. Valid PDF with valid certificate
    Certificate.findById = async () => ({
      _id: mockCertId,
      participantName: "Pritkumar Koradiya",
      recipientEmail: "student@ppsu.ac.in",
      certificateTitle: "Certificate of Participation",
      eventName: "Hackathon 2026",
      certificateCategory: "Hackathon",
      organizationName: "PP Savani University",
      save: async () => {}
    });

    const dispatchRes = createResponse();
    await sendCertificateEmailController(
      {
        params: { id: mockCertId.toString() },
        body: { pdfBase64: validDummyPdf, fileName: "Pritkumar.pdf" }
      },
      dispatchRes
    );
    if (!isEmailConfigured()) {
      assert.equal(dispatchRes.statusCode, 400);
      assert.equal(dispatchRes.body.code, "EMAIL_NOT_CONFIGURED");
    } else {
      assert.equal(dispatchRes.statusCode, 200);
      assert.equal(dispatchRes.body.success, true);
    }
  } finally {
    Certificate.findById = originalFindById;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("updateCertificate resets emailStatus when recipientEmail is modified", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindById = Certificate.findById;
  const originalFindByIdAndUpdate = Certificate.findByIdAndUpdate;

  mongoose.connection.readyState = 1;
  const mockCertId = new mongoose.Types.ObjectId();
  let updatedPayload = null;

  Certificate.findById = async () => ({
    _id: mockCertId,
    certificateId: "CERT-2026-0001",
    participantName: "Pritkumar Koradiya",
    recipientEmail: "old.email@ppsu.ac.in",
    emailStatus: "sent",
    emailSentAt: new Date("2026-08-20"),
    emailSendAttempts: 1
  });

  Certificate.findByIdAndUpdate = async (id, data) => {
    updatedPayload = data;
    return {
      _id: id,
      ...data,
      toObject: () => ({ ...data })
    };
  };

  try {
    const res = createResponse();
    await updateCertificate(
      {
        params: { id: mockCertId.toString() },
        body: { recipientEmail: "new.email@ppsu.ac.in" }
      },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.equal(updatedPayload.recipientEmail, "new.email@ppsu.ac.in");
    assert.equal(updatedPayload.emailStatus, "not-sent");
    assert.equal(updatedPayload.emailSentAt, null);
    assert.equal(updatedPayload.emailSendAttempts, 0);
  } finally {
    Certificate.findById = originalFindById;
    Certificate.findByIdAndUpdate = originalFindByIdAndUpdate;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("sendAllCertificateEmails enforces max 500 limit and queues valid requests", async () => {
  const oversizedRes = createResponse();
  await sendAllCertificateEmails(
    {
      body: {
        certificateIds: Array.from({ length: 501 }, (_, i) => `id_${i}`)
      }
    },
    oversizedRes
  );
  assert.equal(oversizedRes.statusCode, 400);
  assert.match(oversizedRes.body.message, /Maximum 500/);

  const emptyRes = createResponse();
  await sendAllCertificateEmails({ body: { certificateIds: [] } }, emptyRes);
  assert.equal(emptyRes.statusCode, 400);
});

test("emailQueueService maintains queue stats and concurrency limits", () => {
  const status = emailQueueService.getQueueStatus();
  assert.equal(status.concurrency, 2);
  assert.equal(typeof status.pending, "number");
  assert.equal(typeof status.active, "number");
});
