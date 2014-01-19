/**
 * @ngdoc module
 * @name Services
 *
 * @description  The services module for the app.
 */
angular.module('myApp.services', [])

/**
 * The People Service creates an interface to the People REST API for use in controllers.
 */
.factory('People', ['$resource', function ($resource) {

    'use strict';

    // Our Person REST API returns an array of person objects
    return $resource('/people/:personId', {personId: '@_id'}, {
        update: { method: 'PUT' }
    });
}])

.factory('socket', ['$rootScope', function ($rootScope) {

    'use strict';

   //var socket = io.connect();

    return {
        socket: {},
        connect: function () {
            this.socket = io.connect();
        },
        on: function (eventName, callback) {
            var self = this;
            this.socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(self.socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            var self = this;
            this.socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(self.socket, args);
                    }
                });
            });
        }
    };
}])

/**
 * The App State Service provides a global state object for UI coordination.
 */
.service('appState', [function () {

    'use strict';

    // State Models
    this.isLive = true;

    // Debugging messages
    this.debug = false;

    // this.platform = {
    //     ios: function () {
    //         return (/(iPad|iPhone|iPod)/g).test(navigator.userAgent);
    //     }
    // };

    this.touchDevice = (function () {
        return 'ontouchstart' in window || 'onmsgesturechange' in window;
    })();

    // System Messages
    this.message = {
        active: false,
        type: 'banner',
        title: '',
        body: ''
    };

    // Current Page Info
    this.page = {
        title: 'Welcome'
    };

    // Canvas state
    this.menu = {
        isVisible: false
    };

    // Canvas toggle
    this.toggleMenu = function () {
        this.menu.isVisible = !this.menu.isVisible;
    };

}]);