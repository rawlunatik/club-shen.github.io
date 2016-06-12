// Generated by CoffeeScript 1.10.0
var Elo, Game, Match, MatchStatus, Rankings;

Elo = (function() {
  function Elo() {}

  Elo.adjust = function(rating, other, score, k, floor) {
    var expected;
    if (k == null) {
      k = 0;
    }
    if (floor == null) {
      floor = 0;
    }
    expected = this.expectedScore(rating, other);
    return Math.max(floor, Math.round(rating + k * (score - expected)));
  };

  Elo.expectedScore = function(rating, other) {
    var diff;
    diff = other ? other - rating : rating;
    return 1 / (1 + Math.pow(10, diff / 400));
  };

  return Elo;

})();

Rankings = (function() {
  function Rankings() {}

  Rankings.createProfile = function(uid) {
    var ref;
    ref = db.ref("ladders/smash-4/users/" + uid);
    return ref.once("value", function(snapshot) {
      if (!snapshot.val()) {
        return ref.set({
          elo: 1500,
          wins: 0,
          losses: 0,
          matches: []
        }).then(function() {
          return console.log("Created Ranking Profile for UID: " + uid);
        })["catch"](function(error) {
          return console.log("Failed trying to create Ranking Profile for UID: " + uid + ", " + error.message);
        });
      }
    });
  };

  return Rankings;

})();

MatchStatus = (function() {
  function MatchStatus() {}

  MatchStatus.VALID = 0;

  MatchStatus.PENDING = 1;

  MatchStatus.INVALID = 2;

  return MatchStatus;

})();

Game = (function() {
  var characters, match, stage, status, winner;

  match = null;

  status = null;

  stage = null;

  characters = [];

  winner = null;

  function Game(game, match1) {
    var i, j;
    this.match = match1;
    this.reports = game.reports;
    if (this.reports == null) {
      this.status = MatchStatus.PENDING;
      return this;
    }
    for (i = j = 0; j <= 1; i = ++j) {
      if ((this.reports[i].stage == null) || (this.reports[i].winner == null) || (this.reports[i].characters == null)) {
        this.status = MatchStatus.PENDING;
      }
    }
    if (this.reports[0].stage === this.reports[1].stage && this.reports[0].winner === this.reports[1].winner && this.reports[0].characters[0] === this.reports[1].characters[0] && this.reports[0].characters[1] === this.reports[1].characters[1]) {
      this.status = MatchStatus.VALID;
    } else {
      this.status = MatchStatus.INVALID;
    }
    if (this.status === MatchStatus.VALID) {
      this.winner = this.reports[0].winner;
      this.characters = this.reports[0].characters;
      this.stage = this.reports[0].stage;
    }
  }

  Game.prototype.toElement = function() {
    return "<div class=\"game\">\n	<span class=\"winner winner--" + this.winner + "\"></span>\n</div>";
  };

  Game.emptyElement = function() {
    return "<div class=\"game\">\n	<span class=\"winner winner--empty\"></span>\n</div>";
  };

  Game.nullElement = function() {
    return "<div class=\"game\">\n	<span class=\"winner winner--null\"></span>\n</div>";
  };

  return Game;

})();

Match = (function() {
  Match.createList = function(matchArray) {
    var i, matches, v;
    matches = [];
    for (i in matchArray) {
      v = matchArray[i];
      matches.push(new Match(i, v));
    }
    return matches;
  };

  function Match(id, match) {
    var game, i, j, len, ref1, ref2, ref3, wins;
    this.id = id;
    this.games = [];
    ref1 = match.games;
    for (i in ref1) {
      game = ref1[i];
      this.games.push(new Game(game, match));
    }
    this.set = match.set;
    this.time = match.time;
    this.status = MatchStatus.PENDING;
    this.players = match.players;
    if (match.set !== 3 && match.set !== 5) {
      console.log("[WARNING] match " + mid + " has an invalid set number " + match.set + ", so we'll assume it's 3");
      match.set = 3;
    }
    if (match.players.length !== 2) {
      console.log("[ERROR] This match has an invalid number of players (need 2, but found " + match.players.length + ")");
      this.status = MatchStatus.INVALID;
    }
    ref2 = this.games;
    for (j = 0, len = ref2.length; j < len; j++) {
      game = ref2[j];
      if (game.status === MatchStatus.INVALID || game.status === MatchStatus.PENDING) {
        this.status = game.status;
        break;
      }
    }
    if (this.status !== MatchStatus.INVALID) {
      wins = [0, 0];
      this.stages = [];
      this.characters = [[], []];
      ref3 = this.games;
      for (i in ref3) {
        game = ref3[i];
        if (game.winner === 0) {
          wins[0]++;
        }
        if (game.winner === 1) {
          wins[1]++;
        }
        this.stages.push(game.stage);
        this.characters[0].push(game.characters[0]);
        this.characters[1].push(game.characters[1]);
      }
      if (this.set === 3 && wins[0] >= 2 || this.set === 5 && wins[0] >= 3) {
        this.winner = 0;
      }
      if (this.set === 3 && wins[1] >= 2 || this.set === 5 && wins[1] >= 3) {
        this.winner = 1;
      }
    }
  }

  Match.prototype.player = function(i) {
    return this.players[i];
  };

  Match.prototype.challenger = function() {
    return this.player(0);
  };

  Match.prototype.defender = function() {
    return this.player(1);
  };

  Match.prototype.game = function(i) {
    return this.games[i];
  };

  Match.prototype.setCount = function() {
    return this.set;
  };

  Match.prototype.winner = function() {
    var game, j, len, ref1, winners;
    if (this.status() !== 0) {
      return null;
    }
    winners = {
      0: 0,
      1: 0
    };
    ref1 = this.games;
    for (j = 0, len = ref1.length; j < len; j++) {
      game = ref1[j];
      winners[game.winner()]++;
    }
    if (winners[0] >= 2) {
      return 0;
    }
    if (winners[1] >= 2) {
      return 1;
    }
    return null;
  };

  Match.prototype.winnerName = function() {
    return this.player(this.winner());
  };

  Match.prototype.toElement = function() {
    var el, i, j, ref1;
    el = "<div class=\"match\">\n	<div class=\"match--title\">\n		<span class=\"player player--0\">" + (this.player(0)) + "</span>vs<span class=\"player player--1\">" + (this.player(1)) + "</span>\n	</div><div class=\"match--games\">";
    for (i = j = ref1 = this.setCount() - 1; j > -1; i = j += -1) {
      if (i < this.games.length) {
        el += this.games[i].toElement();
      } else {
        el += Game.nullElement();
      }
    }
    el += "	</div>\n</div>";
    return el;
  };

  return Match;

})();