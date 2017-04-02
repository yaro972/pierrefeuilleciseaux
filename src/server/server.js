/*
 * @Author: Thierry Aronoff
 * @Date: 2017-03-24 18:58:12
 * @Last Modified by: Thierry Aronoff
 * @Last Modified time: 2017-04-02 19:49:10
 */

'use strict';

/** @module
 * @description Creation du serveur ExpressJS
 */

// Creation du serveur
let express = require('express');
// const mongoose = require('mongoose');
const app = express();

// Fichier de configuration de l'application
let config = require('./core/config');

// Ajout du module `http`
let http = require('http').Server(app);

// Chargement du module `socket.io`
let io = require('socket.io')(http);

// Activation du module path
let path = require('path');

// Activation du module body parser
let bodyParser = require('body-parser');

// Chargement du module pug
const pug = require('pug');

// Définition du port d'écoute
const PORT = process.env.port || 3000;

// Chargement des fichiers de définition des routes
let index = require('./routes/index');

// Emplacement des fichiers statiques (css, js, images)
app.use(express.static(path.join(__dirname, '..', '/public')));

// Activation de pug
app.set('view engine', 'pug');

// Chargement des méthode d'accès à la db
let db = require('./core/database');

app.use(bodyParser.json());

// Association de la route `/` au fichier de configuration des routes
app.use('/', index);

// Ecoute du port
http.listen(PORT, function() {
  console.log('listening on ' + PORT);
});

//
let RoomManagt = require('./core/roomMgt/roomGest');
let roomManagt = new RoomManagt(io);

// Chargement de la classe accueil
let AccueilClass = require('./core/roomMgt/accueil');
let accueil = new AccueilClass(io);

// Chargement du moteur de jeu
let GameServer = require('./core/gameServer');
let gameServer = new GameServer(io);
// let gameServer = require('./core/gameServer');

// Detection de l'évenement de connection d'un joueur
io.sockets.on('connection', function(socket) {
  socket.broadcast.emit('nouveau joueur');

  console.log('------------------------------------');
  console.log('Joueur ' + socket.id + ' connecté...');
  console.log('------------------------------------');
  // Envoi du nombre de joueurs connectés
  io.sockets.emit('compteur joueurs', socket.server.eio.clientsCount);


  // Detection de l'évenement de déconnection d'un joueur
  socket.on('disconnect', function() {
    console.log('------------------------------------');
    console.log('Joueur ' + socket.id + ' déconnecté...');
    console.log('------------------------------------');

    // Envoi du nombre de joueurs connectés
    io.sockets.emit('compteur joueurs', socket.server.eio.clientsCount);

    // Suppression du joueur de la salle d'attente
    accueil.kick(socket);
  });

  // Login part

  // Detection de l'évènement d'un nouveau message posté
  socket.on('send message', function(data) {
    io.sockets.emit('new message', {
      msg: data,
      username: socket.username,
    });
  });

  // Vérification de l'identifiant du mot de passe
  socket.on('sign in', function(data, callback) {
    db.checkValidity(data.username, data.passwd, callback);
  });

  // Vérification de la disponibilité du pseudo
  socket.on('check pseudo', function(data, callback) {
    db.checkUsername(data.username, callback);
  });

  // Création d'un nouveau compte
  socket.on('creer compte', function(data, callback) {
    db.insertPlayer(data.username, data.passwd, callback);
  });

  // Si l'identification s'est bien effectué,
  // On récupère le nom du joueur
  socket.on('username', function(data) {
    socket.username = data;
    // On salue le nouveau joueur

    // Transfert du nouveau joueur connecté à un salon
    io.to(socket.id).emit('connecte', {
      'msg': 'Bienvenue',
      'username': socket.username,
    });
  });

  // Mise en attente des joueurs
  socket.on('attente', function() {
    // Ajout du joueur dans une salle d'attente
    accueil.push(socket);
    // accueil.dispatch(roomManagt);
  });

  io.to(socket.id).emit('jeu', {
    'yourScore': 1,
    'hisScore': 3,
    'tempsRestant': '3:15',
    'tempsTotal': '4:00',
    'manches': 1,
  });

  //
  gameServer.getReponse(socket);
});
