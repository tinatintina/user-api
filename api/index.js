require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");

const userService = require("../modules/user-service");

const app = express();

app.use(cors());
app.use(express.json());

console.log("Starting user-api...");
console.log("MONGO_URL exists:", !!process.env.MONGO_URL);
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET
};

const strategy = new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
  try {
    if (jwt_payload && jwt_payload.userName) {
      return done(null, {
        _id: jwt_payload._id,
        userName: jwt_payload.userName
      });
    }
    return done(null, false);
  } catch (err) {
    return done(err, false);
  }
});

passport.use(strategy);
app.use(passport.initialize());

let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    await userService.initialize();
    isInitialized = true;
    console.log("MongoDB connected");
  }
}

app.post("/api/user/register", async (req, res) => {
  try {
    await ensureInitialized();
    const msg = await userService.registerUser(req.body);
    res.status(200).json({ message: msg });
  } catch (err) {
    res.status(400).json({ message: err });
  }
});

app.post("/api/user/login", async (req, res) => {
  try {
    await ensureInitialized();

    const user = await userService.checkUser(req.body);

    const payload = {
      _id: user._id,
      userName: user.userName
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.status(200).json({
      message: "login successful",
      token: token
    });
  } catch (err) {
    res.status(400).json({ message: err });
  }
});

app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await ensureInitialized();
      const favourites = await userService.getFavourites(req.user.userName);
      res.status(200).json(favourites);
    } catch (err) {
      res.status(400).json({ message: err });
    }
  }
);

app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await ensureInitialized();
      const favourites = await userService.addFavourite(
        req.user.userName,
        req.params.id
      );
      res.status(200).json(favourites);
    } catch (err) {
      res.status(400).json({ message: err });
    }
  }
);

app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      await ensureInitialized();
      const favourites = await userService.removeFavourite(
        req.user.userName,
        req.params.id
      );
      res.status(200).json(favourites);
    } catch (err) {
      res.status(400).json({ message: err });
    }
  }
);

if (process.env.NODE_ENV !== "production") {
  const HTTP_PORT = process.env.PORT || 8080;

  ensureInitialized()
    .then(() => {
      app.listen(HTTP_PORT, () => {
        console.log(`User API listening on port ${HTTP_PORT}`);
      });
    })
    .catch((err) => {
      console.log("Unable to start server:", err);
    });
}

module.exports = async (req, res) => {
  try {
    await ensureInitialized();
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      message: "Database initialization failed",
      error: String(err)
    });
  }
};