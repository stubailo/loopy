var NUM_STEPS = 32;
var sounds = [
  "bassdrum1.wav",
  "snaredrum1.wav",
  "hihat2.wav",
  "cymbal1.wav"
];

Cells = new Mongo.Collection("cells");

Meteor.methods({
  toggleCell: function(cellId) {
    var active = Cells.findOne(cellId).active;
    Cells.update(cellId, {$set: {active: !active}});
  }
});

if (Meteor.isClient) {
  Session.setDefault("playing", false);

  Session.setDefault("step", 0);
  Session.setDefault("bpm", 120);

  function step() {
    Session.set("step", (Session.get("step") + 1) % NUM_STEPS);

    Cells.find({time: Session.get("step")}).forEach(function (cell) {
      if (cell.active) {
        sounds[cell.instrument].play();
      }
    });
  };

  function play() {
    step();
    Session.set("playing", true);

    Meteor.setTimeout(function () {
      if (Session.get("playing")) {
        play();
      }
    }, 60000 / Session.get("bpm") / 4);
  }

  function pause() {
    Session.set("playing", false);
  }

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
  });

  Template.oneCell.events({
    "click rect": function () {
      Meteor.call("toggleCell", this.cell._id);
    }
  });

  Template.oneCell.helpers({
    xPos: function () {
      return this.cell.time * 25;
    },
    yPos: function () {
      return this.cell.instrument * 25;
    },
    active: function() {
      return this.cell.active;
    }
  });

  Template.main.events({
    'click .play': function () {
      if (Session.get("playing")) {
        pause();
      } else {
        play();
      }
    },
    "change .bpm": function (event) {
      var newBpm = parseInt(event.target.value, 10);
      Session.set("bpm", newBpm);
    }
  });

  Template.main.helpers({
    cells: function () {
      return Cells.find();
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
    selectedBpm: function (bpmOption) {
      return Session.get("bpm") === bpmOption;
    }
  });
}

if (Meteor.isServer) {
  if (Cells.find().count() === 0) {
    _.each(_.range(4), function (instrumentIndex) {
      _.each(_.range(32), function (timeIndex) {
        Cells.insert({
          instrument: instrumentIndex,
          time: timeIndex,
          active: false
        });
      });
    });
  }
}
