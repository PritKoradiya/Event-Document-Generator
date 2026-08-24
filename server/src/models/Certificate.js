import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    participantName: {
      type: String,
      trim: true
    },
    organizationName: {
      type: String,
      trim: true
    },
    eventName: {
      type: String,
      trim: true
    },
    certificateCategory: {
      type: String,
      trim: true
    },
    certificateTitle: {
      type: String,
      trim: true
    },
    eventDate: {
      type: String
    },
    description: {
      type: String,
      trim: true
    },
    templateStyle: {
      type: String,
      trim: true
    },
    authorizedSignatureName: {
      type: String,
      default: "",
      trim: true
    },
    drSignatureName: {
      type: String,
      default: "",
      trim: true
    },
    drSignatureMode: {
      type: String,
      enum: ["blank", "image"],
      default: "blank"
    },
    drSignatureImage: {
      type: String,
      default: null
    },
    authorizedSignatureMode: {
      type: String,
      enum: ["blank", "image"],
      default: "blank"
    },
    authorizedSignatureImage: {
      type: String,
      default: null
    },
    signatureLayout: {
      type: String,
      enum: ["dr-only", "authorized-only", "both"],
      default: "both"
    },
    singleSignaturePosition: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center"
    },
    signatureBoxes: {
      type: [
        {
          _id: false,
          signerName: {
            type: String,
            default: ""
          },
          signerDesignation: {
            type: String,
            default: ""
          },
          signatureMode: {
            type: String,
            enum: ["blank", "image"],
            default: "blank"
          },
          signatureImage: {
            type: String,
            default: null
          }
        }
      ],
      default: [],
      validate: {
        validator: (boxes) => boxes.length <= 3,
        message: "Maximum 3 signature boxes are allowed"
      }
    },
    certificateId: {
      type: String,
      unique: true
    },
    generationType: {
      type: String,
      enum: ["Single", "Bulk"],
      default: "Single"
    },
    status: {
      type: String,
      enum: ["Draft", "Generated"],
      default: "Generated"
    },
    recipientEmail: {
      type: String,
      default: "",
      trim: true
    },
    emailStatus: {
      type: String,
      enum: ["not-sent", "queued", "sending", "sent", "failed"],
      default: "not-sent"
    },
    emailSentAt: {
      type: Date,
      default: null
    },
    emailLastError: {
      type: String,
      default: "",
      trim: true
    },
    emailSendAttempts: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Certificate = mongoose.model("Certificate", certificateSchema);

export default Certificate;
