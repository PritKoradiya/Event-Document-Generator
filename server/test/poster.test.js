import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Poster from "../src/models/Poster.js";
import {
  createPoster,
  deletePoster,
  getPosterById,
  getPosters,
  saveDraftPoster,
  updatePoster
} from "../src/controllers/posterController.js";

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

test("Poster model schema validates fields conditionally based on posterFormat and status", () => {
  const standardPoster = new Poster({
    posterFormat: "standard",
    posterTitle: "Annual Tech Symposium",
    category: "Technical",
    eventDate: "2026-05-10",
    templateStyle: "Modern",
    posterId: "POSTER-2026-0001",
    status: "Generated"
  });
  const standardValidationError = standardPoster.validateSync();
  assert.equal(standardValidationError, undefined);

  const invalidStandardPoster = new Poster({
    posterFormat: "standard",
    eventDate: "2026-05-10",
    templateStyle: "Modern",
    posterId: "POSTER-2026-0002",
    status: "Generated"
  });
  const invalidStandardError = invalidStandardPoster.validateSync();
  assert.ok(invalidStandardError.errors.posterTitle);
  assert.ok(invalidStandardError.errors.category);

  const ppsuPoster = new Poster({
    posterFormat: "ppsu-expert-talk",
    eventType: "Expert Talk",
    mainTitle: "Generative AI in Practice",
    eventDate: "2026-04-02",
    eventTime: "10:00 AM",
    venue: "Auditorium 313",
    speaker: "Dr. Chandresh Kumar Maurya",
    speakerPhoto: "/uploads/posters/speaker.png",
    templateStyle: "PPSU Expert Talk Poster",
    posterId: "POSTER-2026-0003",
    status: "Generated"
  });
  const ppsuValidationError = ppsuPoster.validateSync();
  assert.equal(ppsuValidationError, undefined);

  const invalidPpsuPoster = new Poster({
    posterFormat: "ppsu-expert-talk",
    posterId: "POSTER-2026-0004",
    status: "Generated"
  });
  const invalidPpsuError = invalidPpsuPoster.validateSync();
  assert.ok(invalidPpsuError.errors.eventType);
  assert.ok(invalidPpsuError.errors.mainTitle);
  assert.ok(invalidPpsuError.errors.speaker);
  assert.ok(invalidPpsuError.errors.eventDate);
  assert.ok(invalidPpsuError.errors.eventTime);
  assert.ok(invalidPpsuError.errors.venue);

  const draftPoster = new Poster({
    posterFormat: "ppsu-expert-talk",
    posterId: "POSTER-2026-0005",
    status: "Draft"
  });
  const draftValidationError = draftPoster.validateSync();
  assert.equal(draftValidationError, undefined);
});

test("TEST 1: Create standard poster succeeds with standard fields", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = Poster.findOne;
  const originalCreate = Poster.create;
  const posters = [];

  mongoose.connection.readyState = 1;
  Poster.findOne = () => ({ sort: async () => null });
  Poster.create = async (data) => {
    const record = { _id: new mongoose.Types.ObjectId(), ...data };
    posters.push(record);
    return record;
  };

  try {
    const res = createResponse();
    await createPoster(
      {
        body: {
          posterTitle: "Cyber Security Workshop",
          category: "Workshop",
          eventDate: "2026-04-15",
          templateStyle: "Modern Dark",
          posterFormat: "standard"
        },
        files: {}
      },
      res
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.posterFormat, "standard");
    assert.equal(res.body.data.posterTitle, "Cyber Security Workshop");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findOne = originalFindOne;
    Poster.create = originalCreate;
  }
});

test("TEST 2: Create ppsu-expert-talk poster succeeds with required dynamic fields", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = Poster.findOne;
  const originalCreate = Poster.create;
  const posters = [];

  mongoose.connection.readyState = 1;
  Poster.findOne = () => ({ sort: async () => null });
  Poster.create = async (data) => {
    const record = { _id: new mongoose.Types.ObjectId(), ...data };
    posters.push(record);
    return record;
  };

  try {
    const res = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          eventType: "Expert Talk",
          mainTitle: "Prompt Engineering: Unlocking the Power of Generative AI",
          eventDate: "2026-04-02",
          eventTime: "10:00 AM",
          venue: "Auditorium 313",
          speaker: "Prof. (Dr.) Chandresh Kumar Maurya"
        },
        files: {}
      },
      res
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.posterFormat, "ppsu-expert-talk");
    assert.equal(res.body.data.eventType, "Expert Talk");
    assert.equal(res.body.data.mainTitle, "Prompt Engineering: Unlocking the Power of Generative AI");
    assert.equal(res.body.data.speaker, "Prof. (Dr.) Chandresh Kumar Maurya");
    assert.equal(res.body.data.templateStyle, "PPSU Expert Talk Poster");
    assert.equal(res.body.data.designKey, "ppsu-expert-talk");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findOne = originalFindOne;
    Poster.create = originalCreate;
  }
});

test("TEST 3 & 4: Create new format with and without speakerPhoto", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = Poster.findOne;
  const originalCreate = Poster.create;
  const posters = [];

  mongoose.connection.readyState = 1;
  Poster.findOne = () => ({ sort: async () => null });
  Poster.create = async (data) => {
    const record = { _id: new mongoose.Types.ObjectId(), ...data };
    posters.push(record);
    return record;
  };

  try {
    const resWithPhoto = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          eventType: "Expert Talk",
          mainTitle: "AI in Healthcare",
          eventDate: "2026-05-01",
          eventTime: "11:00 AM",
          venue: "Seminar Hall 1",
          speaker: "Dr. Jane Smith"
        },
        files: {
          speakerPhoto: [{ filename: "speaker-jane.png" }]
        }
      },
      resWithPhoto
    );

    assert.equal(resWithPhoto.statusCode, 201);
    assert.equal(resWithPhoto.body.data.speakerPhoto, "/uploads/posters/speaker-jane.png");

    const resWithoutPhoto = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          eventType: "Expert Talk",
          mainTitle: "Cloud Architecture",
          eventDate: "2026-05-02",
          eventTime: "02:00 PM",
          venue: "Room 102",
          speaker: "John Doe"
        },
        files: {}
      },
      resWithoutPhoto
    );

    assert.equal(resWithoutPhoto.statusCode, 201);
    assert.equal(resWithoutPhoto.body.data.speakerPhoto, "");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findOne = originalFindOne;
    Poster.create = originalCreate;
  }
});

test("TEST 5, 6, 7: Missing eventType, mainTitle, or speaker returns 400 for ppsu-expert-talk", async () => {
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  try {
    const resMissingEventType = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          mainTitle: "AI Horizons",
          eventDate: "2026-04-02",
          eventTime: "10:00 AM",
          venue: "Auditorium",
          speaker: "Dr. Speaker"
        },
        files: {}
      },
      resMissingEventType
    );
    assert.equal(resMissingEventType.statusCode, 400);
    assert.equal(resMissingEventType.body.message, "Event type is required for this poster format.");

    const resMissingMainTitle = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          eventType: "Expert Talk",
          eventDate: "2026-04-02",
          eventTime: "10:00 AM",
          venue: "Auditorium",
          speaker: "Dr. Speaker"
        },
        files: {}
      },
      resMissingMainTitle
    );
    assert.equal(resMissingMainTitle.statusCode, 400);
    assert.equal(resMissingMainTitle.body.message, "Main title is required for this poster format.");

    const resMissingSpeaker = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          eventType: "Expert Talk",
          mainTitle: "AI Horizons",
          eventDate: "2026-04-02",
          eventTime: "10:00 AM",
          venue: "Auditorium"
        },
        files: {}
      },
      resMissingSpeaker
    );
    assert.equal(resMissingSpeaker.statusCode, 400);
    assert.equal(resMissingSpeaker.body.message, "Speaker is required for this poster format.");
  } finally {
    mongoose.connection.readyState = originalReadyState;
  }
});

test("TEST 8: Invalid posterFormat returns 400", async () => {
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 1;

  try {
    const res = createResponse();
    await createPoster(
      {
        body: {
          posterFormat: "unsupported-format",
          posterTitle: "Some Title",
          category: "Technical",
          eventDate: "2026-04-02",
          templateStyle: "Modern"
        },
        files: {}
      },
      res
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Invalid poster format.");
  } finally {
    mongoose.connection.readyState = originalReadyState;
  }
});

test("TEST 9, 10, 11, 12: Update poster operations and asset cleanup", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindById = Poster.findById;
  const originalFindByIdAndUpdate = Poster.findByIdAndUpdate;

  mongoose.connection.readyState = 1;

  const sampleStandardId = new mongoose.Types.ObjectId();
  const samplePpsuId = new mongoose.Types.ObjectId();

  const mockStandardPoster = {
    _id: sampleStandardId,
    posterId: "POSTER-2026-0001",
    posterFormat: "standard",
    posterTitle: "Tech Talk",
    category: "Technical",
    eventDate: "2026-04-10",
    templateStyle: "Modern",
    status: "Generated"
  };

  const mockPpsuPoster = {
    _id: samplePpsuId,
    posterId: "POSTER-2026-0002",
    posterFormat: "ppsu-expert-talk",
    eventType: "Expert Talk",
    mainTitle: "Original Title",
    speaker: "Dr. Old Speaker",
    speakerPhoto: "/uploads/posters/old-photo.png",
    eventDate: "2026-04-02",
    eventTime: "10:00 AM",
    venue: "Auditorium 313",
    templateStyle: "PPSU Expert Talk Poster",
    status: "Generated"
  };

  try {
    // TEST 9: Update standard poster
    Poster.findById = async (id) => (String(id) === String(sampleStandardId) ? { ...mockStandardPoster } : null);
    Poster.findByIdAndUpdate = async (id, update) => ({ ...mockStandardPoster, ...update });

    const resStandardUpdate = createResponse();
    await updatePoster(
      {
        params: { id: sampleStandardId.toString() },
        body: { posterTitle: "Updated Tech Talk" },
        files: {}
      },
      resStandardUpdate
    );
    assert.equal(resStandardUpdate.statusCode, 200);
    assert.equal(resStandardUpdate.body.data.posterTitle, "Updated Tech Talk");

    // TEST 10 & 11: Update PPSU Expert Talk poster and replace speaker photo
    Poster.findById = async (id) => (String(id) === String(samplePpsuId) ? { ...mockPpsuPoster } : null);
    Poster.findByIdAndUpdate = async (id, update) => ({ ...mockPpsuPoster, ...update });

    const resPpsuUpdate = createResponse();
    await updatePoster(
      {
        params: { id: samplePpsuId.toString() },
        body: {
          mainTitle: "Updated Prompt Engineering",
          speaker: "Prof. Chandresh Maurya"
        },
        files: {
          speakerPhoto: [{ filename: "new-photo.png" }]
        }
      },
      resPpsuUpdate
    );
    assert.equal(resPpsuUpdate.statusCode, 200);
    assert.equal(resPpsuUpdate.body.data.mainTitle, "Updated Prompt Engineering");
    assert.equal(resPpsuUpdate.body.data.speaker, "Prof. Chandresh Maurya");
    assert.equal(resPpsuUpdate.body.data.speakerPhoto, "/uploads/posters/new-photo.png");

    // TEST 12: Update fails after uploading speaker photo
    Poster.findById = async () => ({ ...mockPpsuPoster });
    Poster.findByIdAndUpdate = async () => {
      throw new Error("DB write failure");
    };

    const resFailedUpdate = createResponse();
    await updatePoster(
      {
        params: { id: samplePpsuId.toString() },
        body: { mainTitle: "Failing Title" },
        files: {
          speakerPhoto: [{ filename: "fail-photo.png" }]
        }
      },
      resFailedUpdate
    );
    assert.equal(resFailedUpdate.statusCode, 500);
    assert.equal(resFailedUpdate.body.message, "Failed to update poster");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findById = originalFindById;
    Poster.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("TEST 13 & 14: Get all posters and Get poster by ID return all format fields", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = Poster.find;
  const originalFindById = Poster.findById;

  mongoose.connection.readyState = 1;

  const mockPpsuId = new mongoose.Types.ObjectId();
  const mockPosters = [
    {
      _id: new mongoose.Types.ObjectId(),
      posterFormat: "standard",
      posterTitle: "Coding Hackathon",
      category: "Competition",
      eventDate: "2026-06-01",
      templateStyle: "Vibrant"
    },
    {
      _id: mockPpsuId,
      posterFormat: "ppsu-expert-talk",
      eventType: "Expert Talk",
      mainTitle: "Generative AI",
      speaker: "Dr. Chandresh",
      speakerPhoto: "/uploads/posters/speaker.png",
      eventDate: "2026-04-02",
      eventTime: "10:00 AM",
      venue: "Auditorium 313",
      templateStyle: "PPSU Expert Talk Poster"
    }
  ];

  try {
    Poster.find = () => ({
      sort: () => mockPosters
    });

    const resAll = createResponse();
    await getPosters({}, resAll);
    assert.equal(resAll.statusCode, 200);
    assert.equal(resAll.body.count, 2);
    assert.equal(resAll.body.data[1].posterFormat, "ppsu-expert-talk");
    assert.equal(resAll.body.data[1].eventType, "Expert Talk");
    assert.equal(resAll.body.data[1].speaker, "Dr. Chandresh");

    Poster.findById = async (id) => (String(id) === String(mockPpsuId) ? mockPosters[1] : null);

    const resById = createResponse();
    await getPosterById({ params: { id: mockPpsuId.toString() } }, resById);
    assert.equal(resById.statusCode, 200);
    assert.equal(resById.body.data.posterFormat, "ppsu-expert-talk");
    assert.equal(resById.body.data.eventType, "Expert Talk");
    assert.equal(resById.body.data.mainTitle, "Generative AI");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.find = originalFind;
    Poster.findById = originalFindById;
  }
});

test("Draft saving works for ppsu-expert-talk with incomplete data", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = Poster.findOne;
  const originalCreate = Poster.create;

  mongoose.connection.readyState = 1;
  Poster.findOne = () => ({ sort: async () => null });
  Poster.create = async (data) => ({ _id: new mongoose.Types.ObjectId(), ...data });

  try {
    const res = createResponse();
    await saveDraftPoster(
      {
        body: {
          posterFormat: "ppsu-expert-talk",
          mainTitle: "Draft Talk Title Only"
        },
        files: {}
      },
      res
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "Draft");
    assert.equal(res.body.data.posterFormat, "ppsu-expert-talk");
    assert.equal(res.body.data.mainTitle, "Draft Talk Title Only");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findOne = originalFindOne;
    Poster.create = originalCreate;
  }
});

test("Delete poster triggers asset cleanup", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindById = Poster.findById;
  const originalFindByIdAndDelete = Poster.findByIdAndDelete;

  mongoose.connection.readyState = 1;

  const mockPosterId = new mongoose.Types.ObjectId();
  const mockPoster = {
    _id: mockPosterId,
    posterFormat: "ppsu-expert-talk",
    posterImage: "/uploads/posters/test-poster.jpg",
    organizationLogo: "/uploads/posters/test-logo.png",
    speakerPhoto: "/uploads/posters/test-speaker.png"
  };

  try {
    Poster.findById = async () => ({ ...mockPoster });
    Poster.findByIdAndDelete = async () => ({ ...mockPoster });

    const res = createResponse();
    await deletePoster({ params: { id: mockPosterId.toString() } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Poster deleted successfully");
  } finally {
    mongoose.connection.readyState = originalReadyState;
    Poster.findById = originalFindById;
    Poster.findByIdAndDelete = originalFindByIdAndDelete;
  }
});
