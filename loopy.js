var NUM_STEPS = 32;
var sounds = [
  "bassdrum1.wav",
  "snaredrum1.wav",
  "hihat2.wav",
  "cymbal1.wav"
];

Cells = new Mongo.Collection("cells");

if (Meteor.isClient) {
  Session.setDefault("playing", false);

  Session.setDefault("step", 0);
  Session.setDefault("bpm", 120);

  var step = function () {
    Session.set("step", (Session.get("step") + 1) % NUM_STEPS);
  };

  var startStepping = function () {
    if (Session.get("playing")) {
      step();

      Meteor.setTimeout(function () {
        startStepping();
      }, 60000 / Session.get("bpm") / 4);
    } else {
      // Wait until we start playing again
      Tracker.autorun(function () {
        if (Session.get("playing")) {
          Tracker.currentComputation.stop();
          startStepping();
        }
      });
    }
  };

  soundManager.onready(function() {
    sounds = _.map(sounds, function (filename, index) {
      return soundManager.createSound({
        id: 'sound-' + index,
        url: '/' + filename,
        autoLoad: true,
        autoPlay: false,
        onload: function() {
          // loaded
        },
        volume: 50
      });
    });

    startStepping();

    Tracker.autorun(function () {
      if (Session.get("playing")) {
        var step = Session.get("step");

        Cells.find({time: step}).forEach(function (cell) {
          if (cell.active) {
            sounds[cell.instrument].play();
          }
        });
      }
    });
  });

  Template.hello.events({
    'click .play': function () {
      Session.set("playing", ! Session.get("playing"));
    },
    "click rect": function () {
      Cells.update(this._id, {$set: {active: ! this.active}});
    },
    "change .bpm": function (event) {
      var newBpm = parseInt(event.target.value, 10);

      newBpm = Math.min(newBpm, 300);
      newBpm = Math.max(newBpm, 20);

      Session.set("bpm", newBpm);
      console.log(newBpm);
    }
  });

  Template.hello.helpers({
    cells: function () {
      return Cells.find();
    },
    xPos: function () {
      return this.time * 25;
    },
    yPos: function () {
      return this.instrument * 25;
    },
    playing: function () {
      return Session.get("playing");
    },
    stepXPos: function () {
      return Session.get("step") * 25;
    },
    bpm: function () {
      return Session.get("bpm");
    },
    bpmOptions: _.range(20, 300, 5),
    selectedBpm: function () {
      return this.valueOf() === Session.get("bpm");
    }
  });
}

if (Meteor.isServer) {
  if (Cells.find().count() === 0) {
    _.each(_.range(4), function (instrumentIndex) {
      _.each(_.range(32), function (timeIndex) {
        Cells.insert({
          instrument: instrumentIndex,
          time: timeIndex
        });
      });
    });
  }
}