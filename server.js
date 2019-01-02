const express = require('express')
const app = express()

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

// Create mongoose userSchema
var userSchema = new mongoose.Schema({
  username : {type: String, required: true}
});

// Create mongoose exerciseSchema
var exerciseSchema = new mongoose.Schema({
  userId : {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true, default: new Date()}
});

// Create mongoose models
var UserModel = mongoose.model('UserModel', userSchema);
var ExerciseModel = mongoose.model('ExerciseModel', exerciseSchema);

// As of Express 4, body-parser is included in express
app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/add', handleNewExercise);

app.get('/api/exercise/log', handleLogRequest);

app.post('/api/exercise/new-user', handleNewUser);

app.get('/api/exercise/users', handleGetUsers);

// Handles post to /api/exercise/add
function handleNewExercise(req, res, next) {
  insertNewExercise(req.body.userId, 
      req.body.description, 
      Number(req.body.duration), 
      new Date(req.body.date), function(err, exercisedata){
    if (err) {
      console.error('Error inserting exercise', err);
      next(err);
    }
    else {
      getUserById(req.body.userId, function (err, userData) {
        if (err) {
          console.error('Error getting user', err);
          next(err);
        }
        else {
          res.json({
            username: userData.username,
            description: exercisedata.description,
            duration: exercisedata.duration,
            _id: userData._id,
            date: exercisedata.date
          });
        }
      });
    }
  });
}

// Handles calls to /api/exercise/log
function handleLogRequest(req, res, next) {
  getUsersExercises(req.query, function(err, exerciseData) {
    if (err) {
      console.error('Error getting users excercises', err);
      next(err);
    }
    else {
      getUserById(req.query.userId, function(err, userData) {
        if (err) {
          console.error('Error getting user', err);
          next(err);
        }
        else {
          var json = {
            _id: userData._id,
            username: userData.username,
            count: exerciseData.length,
            log: exerciseData            
          };
          res.json(json);
        }
      });
    }
  });
}

// Handles calls to /api/exercise/users
function handleGetUsers(req, res, next) {
  getUsers(function (err, data) {
    if (err) {
      console.error('Error getting users', err);
      next(err);
    }
    else {
      res.json(data);
    }
  });
}

// Handles post to /api/exercise/new-user
function handleNewUser(req, res, next) {
  insertNewUser(req.body.username, function (err, data) {
    if (err) {
      console.error('Error inserting user', err);
      next(err);
    }
    else {
      res.json({_id: data._id, username: data.username});
    }
  });
};


// Gets a user by _id value
function getUserById(userId, callback) {
  UserModel.findOne({_id: userId})
  .select({_id: 1, username : 1})
  .exec(callback);
}

// Gets a users excercises
function getUsersExercises(queryString, callback) {
  var query = ExerciseModel.find({userId: queryString.userId});

  if (queryString.from && queryString.to) {
    query.and({
      date: {
        $gte: new Date(queryString.from),
        $lte: new Date(queryString.to)
      }
    });
  }

  if (queryString.limit) {
    query.limit(Number(queryString.limit));
  }

  query.select({userId: 1, description: 1, duration: 1, date: 1});

  query.exec(callback);
};

// Gets all users from the db sorted by username
function getUsers(callback) {
  UserModel.find()
  .sort('username')
  .select({_id: 1, username : 1})
  .exec(callback);
}

// Inserts a new exercise into the db
function insertNewExercise(userId, description, duration, date, callback) {
  // Create a ExerciseModel
  var exerciseModel = new ExerciseModel({
    userId: userId,
    description: description,
    duration: duration,
    date: date
  });
  // Save to the database
  exerciseModel.save(function (err, data) {
    if (err) return callback(err);
    return callback(null, data);
  });
}

// Inserts a new user into the db
function insertNewUser(username, callback) {
  // Create a UserModel
  var userModel = new UserModel({
    username:  username
  });
  // Save to the Database
  userModel.save(function (err, data) {
    if (err) return callback(err);
    return callback(null, data);
  });
};


/*
 Make sure to add all routes ABOVE the Not found middleware
 */

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
