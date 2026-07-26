import mongoose from "mongoose";

const validateObjectId = (req, res, next, id) => {
  if (mongoose.isValidObjectId(id)) {
    return next();
  }

  const error = new Error("Invalid resource ID.");
  error.status = 400;
  return next(error);
};

export default validateObjectId;
