const User = require("../../models/User");
const Products = require("../../models/Product");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../../utils/mailer-util");
const appleSignin = require("apple-signin-auth");

const generateUsername = require("../../utils/usernamegenerator");

const Userzone = require("../../models/UserZone");

/*  Register a new user (Sign Up) */
const signUp = async (req, res) => {
  try {
    const request = req.body;
    const UserCount = await User.countDocuments();
    const existingUser = await User.findOne({ email: request.email });

    if (existingUser) {
      return res.status(400).json({
        UserCount,
        success: false,
        message: "User With This Email Already Exists",
      });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });

   const username = await generateUsername({
      firstName: request.firstName,
      lastName: request.lastName,
      type: "user",
    });
  
    const user = await User.create({
      ...request,
        username,
      otp,
      role: UserCount ? request.role || "user" : "super-admin",
    });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const htmlFilePath = path.join(
      process.cwd(),
      "src/email-templates",
      "otp.html"
    );
    let htmlContent = fs.readFileSync(htmlFilePath, "utf8");
    htmlContent = htmlContent.replace(/<h1>[\s\d]*<\/h1>/g, `<h1>${otp}</h1>`);
    htmlContent = htmlContent.replace(/usingyourmail@gmail\.com/g, user.email);

    await sendEmail(user.email, "Verify your email", htmlContent);
    res.status(201).json({
      success: true,
      message: "Created User Successfully",
      otp,
      token,
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*  Log in an existing user (Sign In) */
const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    // const user = await User.findOne({ email }).select("+password");

    const user = await User.findOne({ email })
    .select("+password")
    .populate({
      path: "adminRole",
      populate: { path: "permissions" },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    if (!user.password) {
      return res
        .status(404)
        .json({ success: false, message: "User Password Not Found" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect Password" });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const products = await Products.aggregate([
      {
        $match: {
          _id: { $in: user.wishlist },
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          variantWithLeastStock: {
            $reduce: {
              input: "$variants",
              initialValue: {
                stockQuantity: Number.MAX_VALUE,
                price: null,
                salePrice: null,
              },
              in: {
                $cond: [
                  { $lt: ["$$this.stockQuantity", "$$value.stockQuantity"] },
                  {
                    stockQuantity: "$$this.stockQuantity",
                    price: "$$this.price",
                    salePrice: "$$this.salePrice",
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          stockQuantity: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.stockQuantity",
              "$stockQuantity",
            ],
          },
          price: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.price",
              "$price",
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.salePrice",
              "$salePrice",
            ],
          },
        },
      },
      {
        $project: {
          images: 1,
          name: 1,
          slug: 1,

          discount: 1,
          likes: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          stockQuantity: 1,
          vendor: 1,
          shop: 1,
          createdAt: 1,
        },
      },
    ]);

      

    const zone = user?._id ? await Userzone.findOne({ user_id: user._id }) : null;

    console.log("User Zone:", zone , user._id); // 

    return res.status(201).json({
      success: true,
      message: "Login Successfully",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        cover: user.cover,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        zip: user.zip,
        state: user.state,
        about: user.about,
        role: user.role,
        adminRole: user.adminRole || null, 
        wishlist: products,
        zone: zone || null
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*  Send reset password link to user's email */
const forgetPassword = async (req, res) => {
  try {
    const request = req.body;
    const user = await User.findOne({ email: request.email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    const resetPasswordLink = `${request.origin}/auth/reset-password/${token}`;
    const htmlFilePath = path.join(
      process.cwd(),
      "src/email-templates",
      "forget.html"
    );
    let htmlContent = fs.readFileSync(htmlFilePath, "utf8");
    htmlContent = htmlContent.replace(
      /href="javascript:void\(0\);"/g,
      `href="${resetPasswordLink}"`
    );

    await sendEmail(user.email, "Verify your email", htmlContent);

    return res.status(200).json({
      success: true,
      message: "Forgot Password Email Sent Successfully.",
      token,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Reset user password using token */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid Or Expired Token. Please Request A New One.",
        err: err.message,
      });
    }

    const user = await User.findById(decoded._id).select("password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }
    if (!newPassword || !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid Data. Both NewPassword And User Password Are Required.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New Password Must Be Different From The Old Password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: "Password Updated Successfully.",
      user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Verify user OTP code */
const verifyOtp = async (req, res) => {
  try {
    const { otp, email } = req.body;
    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "OTP Has Already Been Verified" });
    }

    if (otp === user.otp) {
      user.isVerified = true;
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "OTP Verified Successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Resend OTP code to user */
const resendOtp = async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
      isVerified: false,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User Not Found or Already Verified",
      });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });
    await User.findByIdAndUpdate(user._id, { otp: otp.toString() });

    const htmlFilePath = path.join(
      process.cwd(),
      "src/email-templates",
      "otp.html"
    );
    let htmlContent = fs.readFileSync(htmlFilePath, "utf8");
    htmlContent = htmlContent.replace(/<h1>[\s\d]*<\/h1>/g, `<h1>${otp}</h1>`);
    htmlContent = htmlContent.replace(/usingyourmail@gmail\.com/g, user.email);

    await sendEmail(user.email, "Verify your email", htmlContent);
    return res.status(200).json({
      success: true,
      message: "OTP Resent Successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const googleSignIn = async (req, res) => {
  try {
    const request = req.body;

    if (!request.email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    let user = await User.findOne({ email: request.email })
  .populate({
    path: "adminRole",
    populate: { path: "permissions" },
  });
    let isNewUser = false;

    // NEW USER — create and auto-verify (Google already verified the email)
    if (!user) {
      const UserCount = await User.countDocuments();

      // Split name into firstName/lastName since Google sends full name
      const nameParts = (request.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      const username = await generateUsername({
        firstName,
        lastName,
        type: "user",
      });

      user = await User.create({
        firstName,
        lastName,
        username,
        email: request.email,
        avatar: request.image || '',
        otp: '000000',        // dummy — required by schema
        phone: 'N/A',         // dummy — required by schema
        gender: 'other',      // dummy — required by schema
        password: Math.random().toString(36) + Math.random().toString(36), // random — required by schema
        isVerified: true,     // Google already verified the email
        role: UserCount === 0 ? 'super-admin' : 'user',
      });

      isNewUser = true;
    }

    // EXISTING UNVERIFIED USER — auto-verify since Google confirmed the email
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate token and return user (same for new and existing)
    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const products = await Products.aggregate([
      { $match: { _id: { $in: user.wishlist || [] } } },
    ]);

        const zone = await Userzone.findOne({
            user_id: user._id
          });

        console.log("User Zone:", zone);

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created and logged in via Google' : 'Google Login Successfully',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
           username: user.username,
        email: user.email,
        cover: user.cover,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        zip: user.zip,
        state: user.state,
        about: user.about,
        role: user.role,
        adminRole: user.adminRole || null, 
        wishlist: products,
        zone: zone || null,
      },
    });

  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const appleSignIn = async (req, res) => {
  try {
    const { id_token, firstName = '', lastName = '', email = '' } = req.body;

    if (!id_token) {
      return res.status(400).json({ success: false, message: "id_token is required" });
    }

    const applePayload = await appleSignin.verifyIdToken(id_token, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const apple_id = applePayload.sub;
    const resolvedEmail = applePayload.email || email;

    if (!resolvedEmail) {
      return res.status(400).json({ success: false, message: "Email could not be retrieved from Apple." });
    }

    let user = await User.findOne({ $or: [{ apple_id }, { email: resolvedEmail }] })
  .populate({
    path: "adminRole",
    populate: { path: "permissions" },
  });
    let isNewUser = false;

    if (!user) {
      const UserCount = await User.countDocuments();
      const resolvedFirst = firstName || 'Apple';
      const resolvedLast = lastName || 'User';
      const username = await generateUsername({ firstName: resolvedFirst, lastName: resolvedLast, type: "user" });

      user = await User.create({
        firstName: resolvedFirst,
        lastName: resolvedLast,
        username,
        email: resolvedEmail,
        apple_id,
        avatar: '',
        otp: '000000',
        phone: 'N/A',
        gender: 'other',
        password: Math.random().toString(36) + Math.random().toString(36),
        isVerified: true,
        role: UserCount === 0 ? 'super-admin' : 'user',
      });
      isNewUser = true;
    } else {
      if (!user.apple_id) { user.apple_id = apple_id; await user.save(); }
      if (!user.isVerified) { user.isVerified = true; await user.save(); }
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const products = await Products.aggregate([
      { $match: { _id: { $in: user.wishlist || [] } } },
    ]);

    const zone = await Userzone.findOne({ user_id: user._id });

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created and logged in via Apple' : 'Apple Login Successfully',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        cover: user.cover,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        zip: user.zip,
        state: user.state,
        about: user.about,
        role: user.role,
        adminRole: user.adminRole || null, 
        wishlist: products,
        zone: zone || null,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  signUp,
  signIn,
  forgetPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  googleSignIn,
  appleSignIn,
};
