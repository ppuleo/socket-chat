/* Controllers */
angular.module('myApp.controllers', [])


/**
 * Admin Page Controller
 */
.controller('AdminCtrl', ['$scope', 'People', function ($scope, People) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** AdminCtrl: Init ***'); }

    // Populate the list of people
    People.query(

        // Sucess
        function (response) {
            $scope.accounts = response;
        },

        // Failure
        function (response) {
            $scope.appState.message = {
                active: true,
                title: 'Error',
                body: response.data.message
            };
        }
    );

    // Public edit account method
    $scope.editAccount = function (_id) {
        $scope.$location.path('/myaccount/' + _id);
    };

    // Public remove account method
    $scope.removeAccount = function (_id, $index) {

        People.delete({personId: _id}, function () {
            $scope.accounts.splice($index, 1);
        });
    };
}])

/**
 * Application Controller
 */
.controller('AppCtrl', ['$scope', '$route', '$timeout', '$window', '$q', '$http', 'appState', 'People', 'socket', function ($scope, $route, $timeout, $window, $q, $http, appState, People, socket) {

    'use strict';

    // Private Methods

    function loadApp() {


        //appState.page.access = $route.current.$$route.access;

        // Expose appState to scope here
        $scope.appState = appState;

        $scope.$route = $route;

        // Set up debugging
        if ($scope.$location.search().debug) {
            $scope.appState.debug = true;
        }

        if ($scope.appState.debug) { console.log('*** AppCtrl: Init ***'); }

        // Add the user object to appState if it's not there
        if (typeof(appState.user) === 'undefined') {

            $scope.appState.user = $window.myApp.user;
        }

        // If the user is already authenticated, announce login
        if ($scope.appState.user.authenticated) {
            $scope.createSocketSession();
        }

        // Automatically hide 'banner style' system messages after 2 seconds.
        $scope.$watch('appState.message.active', function (newValue) {
            if (newValue === true && $scope.appState.message.type === 'banner') {
                $timeout(function () {
                    $scope.appState.message.active = false;
                }, 3000);
            }
        });

        // TEMP: Add the fastclick library since angular touch isn't working yet
        $window.addEventListener('load', function () {
            FastClick.attach(document.body);
        }, false);
    }


    // Public Methods

    /**
     * Gets the current user's Person object
     * @return {promise} Resolves to an object representing the current Person
     */
    $scope.getCurrentPerson = function () {

        // Set up a promise to return
        var deferred = $q.defer();

        People.get({personId: $scope.appState.user._id},

            // Success
            function (response) {

                // Update our appState user object with any changed values
                angular.extend($scope.appState.user, response);

                deferred.resolve(response);
            },

            // Error
            function (error) {

                deferred.resolve(error);
            }
        );

        return deferred.promise;
    };

    /**
     * Ends the current login session
     * @return undefined
     */
    $scope.logout = function () {

        $http.get('/logout')

            .success(function (data, status) {

                socket.emit('offline', {
                    id: $scope.appState.user._id.toString(),
                    name: $scope.appState.user.name.full
                });

                delete $window.myApp.user;
                delete $scope.appState.user;

                $window.myApp.user = {
                    authenticated: false
                };
                $scope.appState.user = $window.myApp.user;

                $scope.go('/home', 'crossFade');
                $scope.appState.message = {
                    active: true,
                    type: 'banner',
                    title: 'Goodbye',
                    body: data.message
                };
            })

            .error(function (err) {
                $scope.go('/login', 'crossFade');
                $scope.appState.message = {
                    active: true,
                    type: 'alert',
                    title: 'Error',
                    body: err
                };
            });
    };

    // Set up socket for this login
    $scope.createSocketSession = function () {

        socket.connect();
        socket.emit('online', {
            id: $scope.appState.user._id.toString(),
            name: $scope.appState.user.name.full
        });

        // Watch for users coming and going
        socket.on('online', function (data) {

            appState.message = {
                active: true,
                type: 'banner',
                title: 'chat',
                body: data.name + ' is now online'
            };
        });

        socket.on('offline', function (data) {
            appState.message = {
                active: true,
                type: 'banner',
                title: 'chat',
                body: data.name + ' is now offline'
            };
        });

    };

    // Initialize the app
    loadApp();
}])

/**
 * Chat Page Controller
 */
.controller('ChatCtrl', ['$scope', 'People', '$routeParams', 'socket', 'appState', function ($scope, People, $routeParams, socket, appState) {

    'use strict';

    $scope.message = {
        text: ''
    };

    $scope.chat = {
        messages: []
    };

    $scope.myId = appState.user._id.toString();

    // Private Methods
    function loadPartner() {
        People.get({personId: $routeParams.id},

            // Sucess
            function (response) {

                $scope.person = response;
            },

            // Failure
            function (response) {
                $scope.appState.message = {
                    active: true,
                    title: 'Error',
                    body: response.data.message
                };
            }
        );
    }

    function createMessage(text) {
        return {
            date: Date.now(),
            name: appState.user.name.full,
            from: appState.user._id.toString(),
            to: $routeParams.id.toString(),
            text: text
        };
    }

    socket.on('send:message', function (message) {

        if (message.from === $routeParams.id.toString()) {
            $scope.chat.messages.push(message);
        }
    });

    // Public Methods
    $scope.sendMessage = function () {

        var newMessage = createMessage($scope.message.text);

        socket.emit('send:message', newMessage);

        $scope.chat.messages.push(newMessage);

        $scope.message.text = '';
    };

    loadPartner();

}])

/**
 * Confirm Account Page Controller
 */
.controller('ConfirmCtrl', ['$scope', '$http', '$routeParams', function ($scope, $http, $routeParams) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** ConfirmCtrl: Init ***'); }

    var confirmPath = '/api/confirm/' + $routeParams.id;
    $scope.confirmSuccess = null;

    $http.get(confirmPath)

    .success(function (data) {

        if (typeof(data.name) !== 'undefined') {

            $scope.userAccount = data;
            $scope.confirmSuccess = true;
        }

        else {

            $scope.confirmSuccess = false;
        }
    })

    .error(function (err) {
        $scope.resent = false;
        $scope.title = 'Error';
        $scope.message = 'Sorry, we were unable to confirm your account. The server said: ' + err;
    });
}])

/**
 * Forgot Password Page Controller
 */
.controller('ForgotCtrl', ['$scope', '$http', 'appState', function ($scope, $http, appState) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** ForgotCtrl: Init ***'); }

    $scope.userAccount = {}; // Set up our model
    $scope.resetSuccess = false;

    $scope.requestPasswordReset = function () {

        var forgotPath = '/api/forgot';
        var data = {
            email: $scope.userAccount.email
        };

        $http.post(forgotPath, data)
            .success(function (data) {

                $scope.resetSuccess = true;
                $scope.resetUser = data;

            })
            .error(function (error, status) {

                var body;

                if (status === 401) {
                    body = 'Sorry, we were unable to find your account.';
                }

                else {
                    body = 'Sorry, we were unable to send your password reset email. ' + error.message;
                }

                appState.message = {
                    active: true,
                    type: 'alert',
                    title: 'Error',
                    body: body
                };

            });
    };
}])

/**
 * Home Page Controller
 */
.controller('HomeCtrl', ['$scope', '$http', function ($scope, $http) {

    'use strict';

    function getLatestCommit() {

        $http.jsonp('https://api.github.com/repos/ppuleo/mean-seed/commits?callback=JSON_CALLBACK')

            .success(function (data, status) {

                $scope.commit = {
                    sha: data.data[0].sha,
                    link: data.data[0].html_url,
                    date: data.data[0].commit.author.date
                };
            })

            .error (function (data, status) {

            });
    }

    getLatestCommit();
}])

/**
 * Login Page Controller
 */
.controller('LoginCtrl', ['$scope', '$http', '$window', '$sce', 'socket', function ($scope, $http, $window, $sce, socket) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** LoginCtrl: Init ***'); }

    $scope.login = function () {

        if ($scope.userAccountForm.$valid) {

            var person = {
                email: $scope.userAccount.email,
                password: $scope.userAccount.password,
                remember: $scope.userAccount.remember
            };

            $http.post('/login', person)

                .success(function (data) {

                    $scope.appState.message = {
                        active: false
                    };
                    $window.myApp.user.authenticated = true; // TODO: why do we care?
                    $scope.appState.user = data;
                    $scope.appState.user.authenticated = true;

                    $scope.createSocketSession();

                    $scope.go('/main', 'crossFade');
                })

                .error(function (err) {

                    $scope.appState.message = {
                        active: true,
                        type: 'alert',
                        title: 'Sorry',
                        body: $sce.trustAsHtml(err)
                    };
                });
        }
        else {
            $scope.appState.message = {
                active: true,
                type: 'alert',
                title: 'Sorry',
                body: 'We do not recognize that email & password. '
            };
        }
    };

    $scope.focusField = '';
}])

/**
 * Main Page Controller
 */
.controller('MainCtrl', ['$scope', 'People', 'appState', function ($scope, People, appState) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** MainCtrl: Init ***'); }

    function loadPeople() {

        // Populate the list of people
        People.query(

            // Sucess
            function (response) {
                for (var i = 0; i < response.length; i++) {
                    if (response[i].id.toString() === appState.user._id.toString()) {
                        response.splice(i, 1);
                    }
                }
                $scope.people = response;
            },

            // Failure
            function (response) {
                $scope.appState.message = {
                    active: true,
                    title: 'Error',
                    body: response.data.message
                };
            }
        );
    }

    loadPeople();
}])

/**
 * Menu Controller
 */
.controller('MenuCtrl', ['$scope', 'appState', function ($scope, appState) {

    'use strict';

}])

/**
 * Message Controller
 */
.controller('MessageCtrl', ['$scope', 'appState', function ($scope, appState) {

    'use strict';

    $scope.closeMessage = function () {

        appState.message.active = false;
    };
}])

/**
 * My Account Page Controller
 */
.controller('MyaccountCtrl', ['$scope', '$routeParams', '$location', 'People', 'appState', function ($scope, $routeParams, $location, People, appState) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** MyaccountCtrl: Init ***'); }

    // Language options
    $scope.languageOptions = ['English US', 'Spanish'];

    if ($routeParams.id) {

        // Get the person specified
        People.get({personId: $routeParams.id},

            // Success
            function (response) {

                if (response.hasOwnProperty('name') !== false) {
                    $scope.user = response;
                }
                else {
                    $scope.appState.message = {
                        active: true,
                        type: 'alert',
                        title: 'Sorry',
                        body: 'We couldn\'t find a person with the supplied id.'
                    };
                }
            },

            // Error
            function (response) {
                appState.message = {
                    active: true,
                    type: 'alert',
                    title: 'Server Error',
                    body: response.data.message
                };
            }
        );
    }
    else {

        // Copy the user object so we can revert if form is cancelled
        $scope.user = angular.copy(appState.user);
    }

    // Update a user account
    $scope.updateAccount = function (account) {

        if (account.$valid) {

            var Person = new People($scope.user);

            Person.$update(

                // Success
                function (response) {

                    // Update our appState user object with any changed values
                    angular.extend($scope.appState.user, response);

                    // User feedback
                    appState.message = {
                        active: true,
                        type: 'banner',
                        title: 'Success',
                        body: 'Your account has been updated.'
                    };
                },

                // Error
                function (response) {
                    console.log(response);
                    appState.message = {
                        active: true,
                        type: 'alert',
                        title: 'Server Error',
                        body: response.data.message
                    };
                }
            );
        }
    };
}])

/**
 * Profile Page Controller
 */
.controller('ProfileCtrl', ['$scope', '$routeParams', 'People', 'appState', '$q', function ($scope, $routeParams, People, appState, $q) {

    'use strict';

    // Debug message
    if ($scope.appState.debug) { console.log('*** ProfileCtrl: Init'); }

    $scope.user = appState.user;
}])

/**
 * Resend Confirmation Email Page Controller
 */
.controller('ResendCtrl', ['$scope', '$http', '$routeParams', function ($scope, $http, $routeParams) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** ResendCtrl: Init ***'); }

    $scope.appState.message.active = false;

    var resendPath = '/resend/' + $routeParams.id;

    $http.get(resendPath)
        .success(function (data) {

            if (typeof(data.name) !== 'undefined') {

                $scope.title = 'Confirmation Resent';
                $scope.username = data.name.first;
                $scope.message = 'Thank you. Check your email inbox and follow the link to confirm your account. Don\'t see it? Check your spam folder and mark it as not spam.';
            }
            else {

                $scope.title = 'Error';
                $scope.message = 'Sorry, we were unable to resend your account confirmation email. ';
                $scope.message += 'Are you sure you signed up?';
            }
        })
        .error(function (err) {
            $scope.resent = false;
            $scope.title = 'Error';
            $scope.message = 'Sorry, we were unable to resend your account confirmation email. The server said: ' + err;
        });
}])

/**
 * Reset Password Page Controller
 */
.controller('ResetCtrl', ['$scope', '$http', 'appState', function ($scope, $http, appState) {

    'use strict';

    function checkResetToken() {

        $scope.validToken = false;
        var token = $scope.$location.search().token;

        $http.get('/api/reset?token=' + token)

        .success(function (data) {
            $scope.resetEmail = data.email;
            $scope.validToken = true;
        })

        .error(function (error) {
            appState.message = {
                active: true,
                type: 'alert',
                title: 'Access Denied',
                body: 'Your password reset token is invalid or has expired. Please contact support for assistance.'
            };
        });
    }

    $scope.resetPassword = function (password) {

        var resetRequest = {
            token: $scope.$location.search().token,
            password: password
        };

        $http.post('/api/reset', resetRequest)

        .success(function (data) {

            $scope.resetSuccess = true;
            $scope.resetName = data.name;
        })

        .error(function (error) {

            appState.message = {
                active: true,
                type: 'alert',
                title: 'Error',
                body: 'We were unable to reset your password. ' + error.message
            };
        });
    };

    // If we don't find the expected token in the querystring, clear the querystring and go to login
    if (!$scope.$location.search().token) {
        $scope.$location.url($scope.$location.path());
        $scope.go('/login', 'slideRight');
    }

    // Otherwise check for a valid token
    else {
        checkResetToken();
    }
}])

/**
 * Settings Page Controller
 */
.controller('SettingsCtrl', ['$scope', 'People', '$http', '$window', function ($scope, People, $http, $window) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** SettingsCtrl: Init ***'); }


}])

/**
 * Signup Page Controller
 */
.controller('SignupCtrl', ['$scope', 'People', 'appState', function ($scope, People, appState) {

    'use strict';

    if ($scope.appState.debug) { console.log('*** SignupCtrl: Init ***'); }

    $scope.newAccount = {};
    $scope.focusField = '';

    // Create a person
    $scope.createAccount = function () {

        if ($scope.newAccountForm.$valid) {

            var newPerson = new People($scope.newAccount); // Create a person object

            newPerson.$save(

                // Success
                function (response) {

                    $scope.newAccount = {}; // Clear the form model
                    $scope.go('/login', 'slideRight');
                    appState.message = {
                        active: true,
                        title: 'Welcome, ' + response.name.first,
                        body: 'Check your inbox for a confirmation email and follow the link.'
                    };
                },

                // Error
                function (response) {
                    appState.message = {
                        active: true,
                        title: 'Sorry',
                        body: 'There was an error creating your account. The server said: ' + response.message
                    };
                }
            );
        }

        else {
            appState.message = {
                active: true,
                title: 'Error',
                body: 'Please make sure all fields are valid'
            };
        }
    };
}]);