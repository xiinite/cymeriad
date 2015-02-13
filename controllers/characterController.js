var model = require('../models/Character.js');
var cmodel = require('../models/Chronicle.js');
var uuid = require('node-uuid');
var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var dt = require('../bin/datetime.js');
var importer = require('../bin/importlogic.js');
var exporter = require('../bin/exportlogic.js');
var vl = require('../bin/vampirelogic.js');
var sec = require('../bin/securityhandler.js');
var mail = require('../bin/emailhandler.js');

var ViewTemplatePath = 'character';
var tmpDir = 'tmp';

var findByDate = function (collection, _date, cb) {
    var coll = collection.slice(0); // create a clone

    (function _loop(data) {
        var date;
        if (typeof data.date == 'string' || data.date instanceof String) {
            date = new Date(data.date);
        } else {
            date = data.date;
        }
        if (date.toUTCString() === _date) {
            cb.apply(null, [data]);
        }
        else if (coll.length) {
            setTimeout(_loop.bind(null, coll.shift()), 25);
        }
    }(coll.shift()));
};
module.exports = {
    'index': function (req, res, next) {
        if (!req.user.isSuperAdmin && !req.user.isAdmin) {
            if (err) return next(new Error("forbidden"));
            return;
        }
        var out = {user: req.user};
        res.render(ViewTemplatePath + "/index", out);
    },
    'all': function (req, res, next) {
        var where = {};
        if (!req.user.isSuperAdmin) {
            var chronicleIds = [];
            for (var i = 0; i < req.user.chronicles.length; i++) {
                chronicleIds.push(req.user.chronicles[i].id)
            }
            where =
            {
                chronicle: {"$in": chronicleIds}
            };
            model.list(where, function (err, result) {
                if (err) return next(new Error(err));
                res.json(result);
            })
        }
        else {
            model.list({}, function (err, result) {
                if (err) return next(new Error(err));
                res.json(result);
            });
        }
    },
    'show': function (req, res, next) {
        if (req.params.id) {
            model.find({
                "id": req.params.id
            }, function (err, result) {
                if (err) return next(new Error(err));
                var character = result[0];

                var out = {
                    user: req.user,
                    character: character
                };
                if (["Rejected", "Concept"].indexOf(character.state) > -1) {
                    res.render(ViewTemplatePath + "/viewconcept", out);
                } else {
                    res.render(ViewTemplatePath + "/show", out);
                }
            });
        }
    },
    'lores': function (req, res, next) {
        if (req.params.id) {
            model.find({
                "id": req.params.id
            }, function (err, result) {
                if (err) return next(new Error(err));
                var character = result[0];

                var lores = [];

                character.abilities.forEach(function (ab) {
                    if (ab.name.indexOf("Lore: ") > -1) {

                        var lore = {
                            name: ab.name.replace("Lore: ", ""),
                            tabname: ab.name.replace("Lore: ", "").replace(":", "_").replace(" ", "_"),
                            html: ""
                        };
                        for (var ratingcount = 1; ratingcount <= ab.rating; ratingcount++) {
                            var filename = ab.name.replace("Lore: ", "").replace("Clan: ", "") + " " + ratingcount + ".html";
                            if (fs.existsSync("server-resources/METRevised/lores/" + filename)) {
                                var data = fs.readFileSync("server-resources/METRevised/lores/" + filename, {});
                                lore.html += data.toString("binary") + "\n";

                            }

                        }
                        lores.push(lore);
                    }
                });
                var out = {
                    user: req.user,
                    character: character,
                    lores: lores
                };
                res.render(ViewTemplatePath + "/lores", out);
            });
        }
    },
    'approve': function (req, res) {
        var out = {user: req.user};
        res.render(ViewTemplatePath + "/approve", out);
    },
    'approvelist': function (req, res, next) {
        model.find({
            state: {$in: ["Concept", "Draft"]}, chronicle: {
                $in: req.user.chronicles.map(function (c) {
                    return c.id;
                })
            }
        }, function (err, result) {
            if (err) return next(new Error(err));
            res.json(result);
        });
    },
    'approveconcept': function (req, res, next) {
        model.find({id: req.body.id}, function (err, result) {
            if (!sec.checkAdmin(req, next, result[0].chronicle.id)) {
                return;
            }

            model.update(req.body.id, {state: req.body.state}, function (err) {
                if (err) return next(new Error(err));
                if (result[0].player.emails.length > 0) {
                    if (req.body.state == "Approved") {
                        mail.sendmail(result[0].player.emails[0].value, "Concept approved: " + result[0].name, "Your concept has been approved by storyteller " + req.user.displayName + ": "
                        + "\nName:" + result[0].name
                        + "\nClan: " + result[0].clan
                        + "\n" + result[0].concept);
                    } else if (req.body.state == "Rejected") {
                        var reason = "";
                        if (req.body.reason !== undefined) {
                            reason = "\nReason: " + req.body.reason.toString();
                        }
                        mail.sendmail(result[0].player.emails[0].value, "Concept rejected: " + result[0].name, "Your concept has been rejected by storyteller " + req.user.displayName.toString() + ": "
                        + reason.toString() + +"\nName:" + result[0].name.toString()
                        + "\nClan: " + result[0].clan.toString()
                        + "\n" + result[0].concept.toString());
                    }
                }
                return res.json("ok");

            });
        });
    },
    'concept': function (req, res) {
        var out = {user: req.user};
        res.render(ViewTemplatePath + "/concept", out);
    },
    'submitconcept': function (req, res, next) {
        var char = vl.emptyCharacter(req.body.chronicle);
        char.googleId = req.user.googleId;
        char.name = req.body.name;
        char.clan = req.body.clan;
        char.concept = req.body.concept;
        char.state = "Concept";
        model.insert(char, function (err) {
            if (err) return next(new Error(err));
            if (req.user.emails.length > 0) {
                mail.sendmail(req.user.emails[0].value, "Concept submitted: " + char.name, "Your concept has been submitted for approval: "
                + "\nName:" + char.name
                + "\nClan: " + char.clan
                + "\n" + char.concept);
            }
            cmodel.find({id: req.body.chronicle}, function (err, result) {
                if (err) return next(new Error(err));
                var c = result[0];
                if (c.email.length > 0) {
                    mail.sendmail(c.email, "Concept submitted: " + char.name, "A new concept is waiting for your approval: " +
                    "\nName:" + char.name
                    + "\nClan: " + char.clan
                    + "\nUser: " + req.user.displayName
                    + "\n" + char.concept);
                }
            });
            res.json({id: char.id});
        });
    },
    'submitbackground': function (req, res) {
        var out = {
            user: req.user
        };
        res.render(ViewTemplatePath + "/concept", out);
    },
    'trash': function (req, res, next) {
        model.find({id: req.params.id}, function (err, result) {
            if (err) return next(new Error(err));
            if (result[0].player.googleId == req.user.googleId) {
                var character = result[0];
                var previousversion = JSON.parse(JSON.stringify(character));
                character.modificationhistory.push({
                    fields: "Trashed",
                    date: new Date(),
                    user: {googleId: req.user.googleId, name: req.user.displayName},
                    previousVersion: previousversion
                });
                model.update(character.id, {
                    state: "Trashed",
                    googleId: "",
                    modificationhistory: character.modificationhistory,
                    modified: new Date()
                }, function (err) {
                    if (err) return next(new Error(err));
                    res.json("ok");
                });
            } else {
                next(new Error("forbidden"));
            }
        });
    },
    'background': function (req, res, next) {
        if (req.params.id) {
            model.find({"id": req.params.id}, function (err, result) {
                if (err) return next(new Error(err));
                var out = {
                    user: req.user,
                    background: result[0].background
                };
                res.render(ViewTemplatePath + "/background", out);
            });
        }
    },
    'new': function (req, res, next) {
        if (req.params.id) {
            if (!sec.checkAdmin(req, next, req.params.id)) {
                return;
            }
            var char = vl.emptyCharacter(req.params.id);
            char.state = "Draft";
            model.insert(char, function (err) {
                if (err) return next(new Error(err));
                var out = {
                    user: req.user,
                    characterid: char.id
                };
                res.render(ViewTemplatePath + "/edit", out);
            });
        }
    },
    'delete': function (req, res, next) {
        if (!sec.checkAdmin(req, next, req.body.chronicleid)) {
            return;
        }
        if (req.body.ids) {
            model.remove({id: {$in: req.body.ids}}, function (err) {
                if (err) return next(new Error(err));
                res.json("ok");

            });
        }
    },
    'edit': function (req, res) {
        if (req.params.id) {
            var out = {
                user: req.user,
                characterid: req.params.id
            };
            res.render(ViewTemplatePath + "/edit", out);
        }
    },
    'update': function (req, res, next) {
        if (req.body.id) {
            model.find({"id": req.body.id}, function (err, result) {
                if (err) return next(new Error(err));
                if (!sec.checkAdmin(req, next, result[0].chronicle.id)) {
                    return;
                }
                var previousversion = JSON.parse(JSON.stringify(result[0]));
                previousversion.modificationhistory = [];
                var modHistory = [];
                for (var i = 0; i < result[0].modificationhistory.length; i++) {
                    modHistory.push(result[0].modificationhistory[i]);
                }
                var fields = req.body.fields;
                var clone = JSON.stringify(fields);
                modHistory.push({
                    fields: clone,
                    date: new Date(),
                    user: {googleId: req.user.googleId, name: req.user.displayName},
                    previousVersion: previousversion
                });
                fields.modificationhistory = modHistory;
                fields.modified = new Date();

                model.update(req.body.id, fields, function (err) {
                    if (err) return next(new Error(err));
                    res.json("ok");
                });
            });
        }
    },
    'find': function (req, res, next) {
        if (req.params.id) {
            model.find({
                "id": req.params.id
            }, function (err, result) {
                if (err) return next(new Error(err));
                if (result.length > 0) {
                    if (!sec.checkOwnership(req, next, result[0])) {
                        return;
                    }
                    res.json(result[0]);
                }
                else {
                    return next(new Error("No result"))
                }
            });
        }
    },
    'revert': function (req, res, next) {
        if (req.body.id && req.body.date) {
            model.find({"id": req.body.id}, function (err, result) {
                if (err) return next(new Error(err));
                if (!sec.checkAdmin(req, next, result[0].chronicle.id)) {
                    return;
                }
                findByDate(result[0].modificationhistory, new Date(req.body.date).toUTCString(), function (data) {
                        var currentversion = JSON.parse(JSON.stringify(result[0]));
                        var oldVersion = JSON.parse(JSON.stringify(data.previousVersion));
                        oldVersion.modificationhistory = result[0].modificationhistory;
                        currentversion.modificationhistory = [];
                        oldVersion.modificationhistory.push({
                            fields: {
                                reversiondate: req.body.date
                            },
                            date: new Date(),
                            user: {
                                googleId: req.user.googleId, name: req.user.displayName
                            }
                            ,
                            previousVersion: currentversion
                        });
                        delete oldVersion._id;
                        model.update(req.body.id, oldVersion, function (err) {
                            if (err) return next(new Error(err));
                            res.json("ok");
                        });
                    }
                );
            });
        }
    },
    'clear': function (req, res, next) {
        if (!sec.checkSU(req, next)) {
            return;
        }
        model.clear(function () {
            res.json('ok');
        });
    },
    'import': function (req, res, next) {
        if (!sec.checkAdmin(req, next, req.params.chronicleid)) {
            return;
        }

        if (req.params.chronicleId && req.files['files[]']) {
            var file = req.files['files[]'];
            var parser = new xml2js.Parser();

            parser.addListener('end', function (result) {
                importer.importgrapevine(result, req.params.chronicleId, function (err) {
                    if (err) {
                        res.json(err);
                        fs.unlink(tmpDir + '/' + file.name, function (err) {
                            if (err) return next(new Error(err));
                        });
                    } else {
                        fs.unlink(tmpDir + '/' + file.name, function (err) {
                            if (err) return next(new Error(err));
                        });
                    }

                });
            });

            fs.readFile(tmpDir + '/' + file.name, function (err, data) {
                if (path.extname(file.name) === ".gv3") parser.parseString(data.toString("binary"));
                if (path.extname(file.name) === ".json") {
                    importer.importjson(JSON.parse(data.toString("binary")), req.params.chronicleId, function (err, result) {
                        if (err) {
                            next(err);
                            fs.unlink(tmpDir + '/' + file.name, function (err) {
                                if (err) return next(new Error(err));
                            });
                        }
                        else {
                            fs.unlink(tmpDir + '/' + file.name, function (err) {
                                if (err) return next(new Error(err));
                                res.json(result);
                            });
                        }
                    });
                }
            });
        }
    },
    'wizard': function (req, res) {
        var out = {user: req.user, characterid: req.params.id};
        res.render(ViewTemplatePath + "/wizard", out);
    },
    'export': function (req, res, next) {
        if (!sec.checkAdmin(req, next, req.params.chronicleid)) {
            return;
        }

        if (req.params.exporttype === "gv3") {
            exporter.exportgv3(res, next, req.params.chronicleid);
        } else if (req.params.exporttype === "json") {
            exporter.exportjson(res, next, req.params.chronicleid);
        }
    },
    'populate': function (req, res, next) {
        if (!sec.checkSU(req, next)) {
            return;
        }
        model.clear(function (err) {
            if (err) return next(new Error(err));
            model.insert({
                id: uuid.v4(),
                name: "Jozef van Gelderland",
                googleId: "114799359163510443499",
                chronicle: "67abf1a1-d331-4e18-8739-93895c7a639d",
                state: "Active",
                experience: {
                    total: 11,
                    unspent: 3
                },
                created: new Date(2013, 3, 21),
                modified: new Date(2014, 1, 25),
                clan: "Tremere",
                sect: "Camarilla",
                coterie: "",
                generation: 11,
                title: "Keeper of Elysium",
                sire: "",
                nature: "Monster",
                demeanor: "Survivor",
                bloodpool: {
                    total: 12,
                    current: 8
                },
                willpower: {
                    total: 4,
                    current: 3
                },
                path: {
                    type: "Humanity",
                    rating: 3
                },
                conscience: {
                    type: "Conscience",
                    rating: 2
                },
                selfcontrol: {
                    type: 'Self-Control',
                    rating: 4
                },
                courage: {
                    type: "Courage",
                    rating: 4
                },
                aura: 0,
                attributes: {
                    physical: ["Brutal", "Quick", "Resilient", "Rugged", "Though"],
                    social: ["Empathic", "Intimidating", "Persuasive"],
                    mental: ["Dedicated", "Disciplined", "Insightful", "Knowledgeable", "Observant", "Patient", "Rational", "Rational", "Vigilant"],
                    negativephysical: [],
                    negativesocial: [],
                    negativemental: []
                },
                abilities: [{
                    name: "Dodge",
                    rating: 1,
                    note: ""
                }, {
                    name: "Linguistics",
                    rating: 2,
                    note: "Duits, Engels"
                }, {
                    name: "Lore: Camarilla",
                    rating: 3,
                    note: ""
                }, {
                    name: "Lore: City",
                    rating: 1,
                    note: ""
                }, {
                    name: "Lore: Kindred",
                    rating: 1,
                    note: ""
                }, {
                    name: "Occult",
                    rating: 4,
                    note: ""
                }, {
                    name: "Survival",
                    rating: 1,
                    note: ""
                }

                ],
                disciplines: [{
                    path: "Protean",
                    name: "Eyes of the beast",
                    level: "basic",
                    number: 1
                }, {
                    path: "Thaumaturgy: Path of Blood",
                    name: "Taste for Blood",
                    level: "basic",
                    number: 1
                }, {
                    path: "Thaumaturgy: Path of Blood",
                    name: "Blood Rage",
                    level: "basic",
                    number: 2
                }, {
                    path: "Thaumaturgy: Lure of Flames",
                    name: "Hand of Flame",
                    level: "basic",
                    number: 1
                }, {
                    path: "Thaumaturgy: Lure of Flames",
                    name: "Flame Bolt",
                    level: "basic",
                    number: 2
                }, {
                    path: "Thaumaturgy: Lure of Flames",
                    name: "Wall of Fire",
                    level: "intermediate",
                    number: 3
                }, {
                    path: "Thaumaturgy: Lure of Flames",
                    name: "Engulf",
                    level: "intermediate",
                    number: 4
                }],
                rituals: [{
                    name: "Communicate with Kindred Sire",
                    level: "basic"
                }, {
                    name: "Defence of the Sacred Haven",
                    level: "basic"
                }, {
                    name: "Deflection of Wooden Doom",
                    level: "basic"
                }, {
                    name: "The Open Passage",
                    level: "basic"
                }, {
                    name: "Incorporeal Passage",
                    level: "intermediate"
                }],
                status: [{
                    name: "Honored"
                }],
                backgrounds: [{
                    name: "Generation",
                    rating: 2
                }, {
                    name: "Herd",
                    rating: 2
                }, {
                    name: "Resources",
                    rating: 3
                }],
                influences: [{
                    name: "Health",
                    rating: 1
                }, {
                    name: "Occult",
                    rating: 3
                }],
                misc: [{
                    name: "NPC",
                    rating: 1
                }],
                derangements: [],
                bloodbonds: [],
                boons: [],
                merits: [{
                    name: "Common Sense",
                    cost: 1
                }, {
                    name: "Magic Resistance",
                    cost: 2
                }],
                flaws: [{
                    name: "Bad Sight",
                    cost: 1
                }, {
                    name: "Cast No Reflection",
                    cost: 1
                }, {
                    name: "Repulsed by Garlic",
                    cost: 1
                }],
                healthlevels: {
                    healthy: 2,
                    bruised: 3,
                    wounded: 2,
                    incapacitated: 1,
                    torpor: 1,
                    spent: 0
                },
                equipment: [],
                notes: [{
                    value: "Storytelling NPC"
                }],
                experiencehistory: [{
                    date: new Date(2013, 6, 29),
                    change: 5,
                    reason: "Attendance"
                }, {
                    date: new Date(2013, 8, 23),
                    change: -1,
                    reason: "Purchase: Linguistics"
                }]
            }, function (err) {
                if (err) return next(new Error(err));
                model.all(function (err, result) {
                    if (err) return next(new Error(err));
                    res.json(result);
                });
            });
        });
    }
};
