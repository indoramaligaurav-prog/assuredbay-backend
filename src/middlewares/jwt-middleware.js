const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No Token Provided" });
  }

  jwt.verify(
    token.replace("Bearer ", ""),
    process.env.JWT_SECRET || "123456",
    (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Token expired",
            code: "TOKEN_EXPIRED",
          });
        }
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      req.user = decoded;
      next();
    }
  );
}
module.exports = verifyToken;
