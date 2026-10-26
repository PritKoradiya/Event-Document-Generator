import mongoose from "mongoose";

const getDocumentStatus = function () {
  if (this.status) return this.status;
  if (typeof this.getUpdate === "function") {
    const update = this.getUpdate();
    return update?.status || update?.$set?.status || "Generated";
  }
  return "Generated";
};

const getDocumentFormat = function () {
  if (this.posterFormat) return this.posterFormat;
  if (typeof this.getUpdate === "function") {
    const update = this.getUpdate();
    return update?.posterFormat || update?.$set?.posterFormat || "standard";
  }
  return "standard";
};

const isStandardGeneratedPoster = function () {
  const status = getDocumentStatus.call(this);
  const format = getDocumentFormat.call(this);
  return status !== "Draft" && format === "standard";
};

const isPpsuGeneratedPoster = function () {
  const status = getDocumentStatus.call(this);
  const format = getDocumentFormat.call(this);
  return status !== "Draft" && format === "ppsu-expert-talk";
};

const isAnyGeneratedPoster = function () {
  const status = getDocumentStatus.call(this);
  return status !== "Draft";
};

const posterSchema = new mongoose.Schema(
  {
    posterFormat: {
      type: String,
      enum: ["standard", "ppsu-expert-talk"],
      default: "standard"
    },
    posterTitle: {
      type: String,
      required: isStandardGeneratedPoster,
      trim: true,
      default: ""
    },
    tagline: {
      type: String,
      default: ""
    },
    category: {
      type: String,
      required: isStandardGeneratedPoster,
      default: ""
    },
    eventDate: {
      type: String,
      required: isAnyGeneratedPoster
    },
    eventTime: {
      type: String,
      required: isPpsuGeneratedPoster,
      default: ""
    },
    venue: {
      type: String,
      required: isPpsuGeneratedPoster,
      default: ""
    },
    speakerName: {
      type: String,
      default: ""
    },
    speakerDesignation: {
      type: String,
      default: ""
    },
    eventType: {
      type: String,
      required: isPpsuGeneratedPoster,
      trim: true,
      default: ""
    },
    mainTitle: {
      type: String,
      required: isPpsuGeneratedPoster,
      trim: true,
      default: ""
    },
    speaker: {
      type: String,
      required: isPpsuGeneratedPoster,
      trim: true,
      default: ""
    },
    speakerPhoto: {
      type: String,
      default: ""
    },
    organizerName: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    contactInformation: {
      type: String,
      default: ""
    },
    registrationText: {
      type: String,
      default: "Register Now"
    },
    templateStyle: {
      type: String,
      required: isAnyGeneratedPoster
    },
    designKey: {
      type: String,
      default: ""
    },
    posterImage: {
      type: String,
      default: ""
    },
    organizationLogo: {
      type: String,
      default: ""
    },
    posterId: {
      type: String,
      unique: true,
      required: true
    },
    status: {
      type: String,
      enum: ["Draft", "Generated"],
      default: "Generated"
    }
  },
  {
    timestamps: true
  }
);

const Poster = mongoose.model("Poster", posterSchema);

export default Poster;
