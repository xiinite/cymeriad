var express = require('express');
var router = require('../bin/routehandler.js');
var homeController = require('../controllers/homeController.js');
var home = express.Router();
var config = require('../config/configuration.js');

home.get('/', homeController.home);
home.get('/login', homeController.login);

home.get('/.well-known/acme-challenge/2j1h_BUX-Lx4rSwAH_q_Z8oNTv0YiqYgJZumaSE-Shc', function(req, res, next){
    res.write('2j1h_BUX-Lx4rSwAH_q_Z8oNTv0YiqYgJZumaSE-Shc.jtcmn4N0uiJbxbvV10ZcrSQerzVpGJtmPb4ruUUF2Vs');
    res.end();
});
home.get('/.well-known/acme-challenge/2tanuh72FdFb56LbtKxu5ZMnaRn8UH9GydXUuRasa9c', function(req, res, next){
    res.write('2tanuh72FdFb56LbtKxu5ZMnaRn8UH9GydXUuRasa9c.jtcmn4N0uiJbxbvV10ZcrSQerzVpGJtmPb4ruUUF2Vs');
    res.end();
});
home.get('/.well-known/acme-challenge/ExULRuqeNsjt5LPd5WU1XWpfIc_BrjZsfqr_ApJEtuE', function(req, res, next){
    res.write('ExULRuqeNsjt5LPd5WU1XWpfIc_BrjZsfqr_ApJEtuE.jtcmn4N0uiJbxbvV10ZcrSQerzVpGJtmPb4ruUUF2Vs');
    res.end();
});

module.exports = {
    'config': function (app) {
        app.use('/', home);

        router.register(app, 'character');
        router.register(app, 'chronicle');
        router.register(app, 'downtime');
        router.register(app, 'event');
        router.register(app, 'gametype');
        router.register(app, 'superAdmin');
        router.register(app, 'user');

        router.get(app, 'character', 'new', [':id']);
        router.get(app, 'character', 'influences');
        router.get(app, 'character', 'status');
        router.get(app, 'character', 'harpyreport');
        router.get(app, 'character', 'harpies');
        router.get(app, 'character', 'visualise', [':id']);
        router.get(app, 'character', 'socialbonds');
        router.get(app, 'character', 'all', [':full']);
        router.get(app, 'character', 'showoldversion', [':id', ':version']);
        router.get(app, 'character', 'showall', []);
        router.get(app, 'character', 'lores', [':id']);
        router.get(app, 'character', 'background', [':id']);
        router.get(app, 'character', 'trash', [':id']);
        router.get(app, 'character', 'wizard', [':id']);
        router.get(app, 'character', 'assignfreebies', [':id']);
        router.get(app, 'character', 'export', [":chronicleid", ":exporttype"]);
        router.get(app, 'character', 'findbyname', [":name", ":chronicleid"]);
        router.get(app, 'character', 'allByPlayer', [":chronicleid"]);
        router.get(app, 'character', 'showbychronicle', [":chronicleid"]);
        router.post(app, 'character', 'all');
        router.post(app, 'character', 'all', [':full']);
        router.post(app, 'character', 'import', [':chronicleId']);
        router.post(app, 'character', 'revert');
        router.post(app, 'character', 'submitconcept');
        router.post(app, 'character', 'approveconcept');
        router.post(app, 'character', 'submitdraft');
        router.post(app, 'character', 'submitbackground');
        router.post(app, 'character', 'approvebackground');
        router.post(app, 'character', 'approvefinal');
        router.post(app, 'character', 'awardxp');

        router.get(app, 'chronicle', 'editmap', [':id']);
        router.get(app, 'chronicle', 'showmap', [':id']);
        router.get(app, 'chronicle', 'getmap', [':id']);
        router.post(app, 'chronicle', 'insert');
        router.post(app, 'chronicle', 'addadmin');
        router.post(app, 'chronicle', 'removeadmin');
        router.post(app, 'chronicle', 'addplayer');
        router.post(app, 'chronicle', 'removeplayer');
        router.post(app, 'chronicle', 'updatemap');

        router.get(app, 'downtime', 'allPeriods');
        router.get(app, 'downtime', 'openPeriods');
        router.get(app, 'downtime', 'submittedPeriods');
        router.get(app, 'downtime', 'findPeriod', [':id']);
        router.get(app, 'downtime', 'submit', [':id']);
        router.get(app, 'downtime', 'modify', [':id']);
        router.get(app, 'downtime', 'review', [':id']);
        router.get(app, 'downtime', 'handle', [':id']);
        router.get(app, 'downtime', 'visualise', [':id']);
        router.get(app, 'downtime', 'listbyperiod', [':id']);
        router.get(app, 'downtime', 'submittedCharacters', [':id']);
        router.post(app, 'downtime', 'savesubmission');
        router.post(app, 'downtime', 'updatesubmission');

        router.get(app, 'gametype', 'new');

        router.get(app, 'user', 'toggleSuperAdmin', [':id']);
        router.post(app, 'user', 'updateStylesheet');
        router.post(app, 'user', 'updateEmail');

        for (var i = 0, len = config.staticText.length; i < len; i++) {
            var route = config.staticText[i];
            router.staticText(app, route.path, route.text);
        }
    }
};
