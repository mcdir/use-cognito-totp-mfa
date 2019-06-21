global.fetch = require('node-fetch');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const prompt = require('prompt');
const qrcode = require('qrcode-terminal');

const config = require('./config');


login = function () {
    prompt.start();
    let prompt_schema = {
        properties: {
            username: {required: true},
            password: {hidden: true}
            // username: {required: false},
            // password: {hidden: true}
        }
    };
    prompt.get(prompt_schema, function (err, result) {
        let username = result['username'];
        let password = result['password'];
        // let username = "user";
        // let password = "password";
        // console.log(username, "/", password);

        // Setting of user pool ID, application client ID
        let poolData = {
            UserPoolId: config.UserPoolId,
            ClientId: config.ClientId
        };

        // User setting
        let userData = {
            Username: username,
            Pool: new AmazonCognitoIdentity.CognitoUserPool(poolData)
        };
        let cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        // Setting of authentication information
        let authenticationData = {
            Username: username,
            Password: password
        };
        let authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        // Ask Cognito for certification
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                // occurs on successful authentication
                console.log('onSuccess');
                console.log('occur on successful authentication');
                let idToken = result.getIdToken().getJwtToken();
                console.log('token obtained ^^');
                console.log(idToken);
            },
            newPasswordRequired: function (userAttributes, requiredAttributes) {
                // After user creation, password change is required at first login
                // For now, temporary password is set as it is
                console.log('must change password on first login after creating user');
                cognitoUser.completeNewPasswordChallenge(password, {}, this);
            },
            mfaSetup: function (challengeName, challengeParameters) {
                // Occurs when MFA is enabled in the user pool
                console.log('mfaSetup');
                console.log('occurs when MFA is enabled in the user pool');
                cognitoUser.associateSoftwareToken(this);
            },
            associateSecretCode: function (secretCode) {
                // MFA is activated and occurs at the time of TOTP initial certification
                // SecretCode will be issued, so you can register with Google Authenticator etc.
                // Generate QR code. (Sometimes manually enter the secret code)
                console.log('associateSecretCode');
                console.log('MFA is enabled and will occur at TOTP initial authentication');

                // Generate QR code and display on terminal
                let url = 'otpauth: // totp / Test? secret =' + secretCode + '& issuer = Cognito-TOTP-MFA';
                console.log('secret code:' + secretCode);
                qrcode.generate(url, {small: true});

                let _this = this;
                let getValue = 'Please read the QR code on Google Authenticator and enter your one-time password';
                prompt.get([getValue], function (err, result) {
                    challengeAnswer = result [getValue];
                    cognitoUser.verifySoftwareToken(result [getValue], 'My TOTP device', _this);
                    console.log('No need to read QR code from second time');
                });
            },
            totpRequired: function (secretCode) {
                // occurs when one time password is requested
                // Enter a one-time password from Google Authenticator etc.
                console.log('totpRequired');
                console.log('occur when requesting a one-time password');

                let _this = this;
                let getValue = 'Please enter your Google Authenticator one-time password';
                prompt.get([getValue], function (err, result) {
                    var challengeAnswer = result [getValue];
                    cognitoUser.sendMFACode(challengeAnswer, _this, 'SOFTWARE_TOKEN_MFA');
                });
            },
            onFailure: function (err) {
                console.log('onFailure');
                console.log('occur when authentication fails');
                console.log(err);
            }
        });
    });
};

login();