// sockets functionality
module.exports = function (io, app, envConfig) {

    'use strict';

    var passportSocketIo = require('passport.socketio');
    var express = require('express');
    var onlineUsers = [];

    function onAuthorizeSuccess(data, accept) {
        console.log('successful connection to socket.io');

        // The accept-callback still allows us to decide whether to
        // accept the connection or not.
        accept(null, true);
    }

    function onAuthorizeFail(data, message, error, accept) {
        if (error) {

            console.log('failed connection to socket.io:', message);
        }

        // We use this callback to log all of our failed connections.
        accept(null, false);
    }

    function isOnline(id) {
        for (var i = 0, length = onlineUsers.length; i < length; i++) {
            if (onlineUsers[i].id === id) {
                return [true, i];
            }
        }

        return [false, null];
    }

    // set authorization for socket.io
    io.set('authorization', passportSocketIo.authorize(
        {
            cookieParser: express.cookieParser,
            key: 'mean.sid', // Note: this must match the key used in the express session
            secret: 'spicy lamb vindaloo',
            store: app.get('sessionStore'),
            success: onAuthorizeSuccess,  // *optional* callback on success
            fail: onAuthorizeFail,     // *optional* callback on fail/error
        },
        function () {
            console.log('Express session connection open');
        }
    ));

    io.set('log level', 2);

    io.sockets.on('connection', function (socket) {

        // Online Announce
        socket.on('online', function (data) {
            if (!isOnline(data.id)[0]) {
                onlineUsers.push({
                    id: data.id,
                    name: data.name
                });

                socket.broadcast.emit('online', data);
                console.log(onlineUsers);
            }
        });

        // Chat messages
        socket.on('send:message', function (data) {

            passportSocketIo.filterSocketsByUser(io, function (user) {
                return user.id === data.to;
            }).forEach(function (socket) {
                socket.emit('send:message', data);
            });
        });

        socket.on('offline', function (data) {

            var index = isOnline(data.id);

            if (index[0]) {
                onlineUsers.splice(index[1], 1);
                console.log(onlineUsers);
                socket.broadcast.emit('offline', {
                    id: data.id,
                    name: data.name
                });

                console.log(data.name + ' disconnected');
            }
        });

        socket.on('disconnect', function () {

            var index = isOnline(socket.handshake.user._id.toString());

            if (index[0]) {
                onlineUsers.splice(index[1], 1);
                socket.broadcast.emit('offline', {
                    id: socket.handshake.user._id.toString(),
                    name: socket.handshake.user.name.full
                });
            }
            console.log(socket.handshake.user.name.full + ' disconnected');
        });

    });

};