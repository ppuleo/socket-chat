/**
 * @ngdoc module
 * @name Services
 *
 * @description  The services module for the app.
 */

myApp.services = angular.module('myApp.services', []);

/**
 * The People Service creates an interface to the People REST API for use in controllers.
 */
myApp.services.factory('People', ['$resource', function ($resource) {

    'use strict';

    // Our Person REST API returns an array of person objects
    return $resource('/people/:personId', {personId: '@_id'}, {
        update: { method: 'PUT' }
    });
}]);

/**
 * The App State Service provides a global state object for UI coordination.
 */
myApp.services.service('appState', [function () {

    'use strict';

    // State Models
    this.isLive = true;

    // Debugging messages
    this.debug = false;

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

}]);