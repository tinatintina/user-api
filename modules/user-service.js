const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

let User;

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  favourites: {
    type: [String],
    default: []
  }
});

module.exports.initialize = async function () {
  try {
    const db = await mongoose.connect(process.env.MONGO_URL);
    User = db.model("users", userSchema);
  } catch (err) {
    throw err;
  }
};

module.exports.registerUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      if (userData.password !== userData.password2) {
        reject("Passwords do not match");
        return;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = new User({
        userName: userData.userName,
        password: hashedPassword,
        favourites: []
      });

      await newUser.save();
      resolve("User registered successfully");
    } catch (err) {
      if (err.code === 11000) {
        reject("User Name already taken");
      } else {
        reject(`There was an error creating the user: ${err}`);
      }
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ userName: userData.userName });

      if (!user) {
        reject(`Unable to find user: ${userData.userName}`);
        return;
      }

      const isMatch = await bcrypt.compare(userData.password, user.password);

      if (!isMatch) {
        reject(`Incorrect Password for user: ${userData.userName}`);
        return;
      }

      resolve(user);
    } catch (err) {
      reject(`There was an error verifying the user: ${err}`);
    }
  });
};

module.exports.getFavourites = function (userName) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ userName: userName });

      if (!user) {
        reject(`Unable to find user: ${userName}`);
        return;
      }

      resolve(user.favourites);
    } catch (err) {
      reject(`There was an error getting favourites: ${err}`);
    }
  });
};

module.exports.addFavourite = function (userName, favouriteId) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ userName: userName });

      if (!user) {
        reject(`Unable to find user: ${userName}`);
        return;
      }

      if (!user.favourites.includes(favouriteId)) {
        user.favourites.push(favouriteId);
        await user.save();
      }

      resolve(user.favourites);
    } catch (err) {
      reject(`There was an error adding favourite: ${err}`);
    }
  });
};

module.exports.removeFavourite = function (userName, favouriteId) {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ userName: userName });

      if (!user) {
        reject(`Unable to find user: ${userName}`);
        return;
      }

      user.favourites = user.favourites.filter((id) => id !== favouriteId);
      await user.save();

      resolve(user.favourites);
    } catch (err) {
      reject(`There was an error removing favourite: ${err}`);
    }
  });
};