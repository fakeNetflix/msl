/**
 * Copyright (c) 2012-2014 Netflix, Inc.  All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Unauthenticated authentication factory unit tests.
 * 
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
describe("UnauthenticatedAuthenticationFactory", function() {
    const MslEncoderFormat = require('../../../../../core/src/main/javascript/io/MslEncoderFormat.js');
    const UnauthenticatedAuthenticationFactory = require('../../../../../core/src/main/javascript/entityauth/UnauthenticatedAuthenticationFactory.js');
    const EntityAuthenticationScheme = require('../../../../../core/src/main/javascript/entityauth/EntityAuthenticationScheme.js');
    const UnauthenticatedAuthenticationData = require('../../../../../core/src/main/javascript/entityauth/UnauthenticatedAuthenticationData.js');
    const MslEntityAuthException = require('../../../../../core/src/main/javascript/MslEntityAuthException.js');
    const MslEncoderUtils = require('../../../../../core/src/main/javascript/io/MslEncoderUtils.js');
    const MslEncodingException = require('../../../../../core/src/main/javascript/MslEncodingException.js');
    const MslError = require('../../../../../core/src/main/javascript/MslError.js');

    const MockAuthenticationUtils = require('../../../main/javascript/util/MockAuthenticationUtils.js');
    const MockMslContext = require('../../../main/javascript/util/MockMslContext.js');
    const MslTestUtils = require('../../../main/javascript/util/MslTestUtils.js');
    
    /** MSL encoder format. */
    var ENCODER_FORMAT = MslEncoderFormat.JSON;
    
    /** Key entity identity. */
    var KEY_IDENTITY = "identity";
    
    var UNAUTHENTICATED_ESN = "MOCKUNAUTH-ESN";
    
    /** MSL context. */
    var ctx;
    /** MSL encoder factory. */
    var encoder;
    /** Authentication utils. */
    var authutils = new MockAuthenticationUtils();
    /** Entity authentication factory. */
    var factory = new UnauthenticatedAuthenticationFactory(authutils);
    
    var initialized = false;
    beforeEach(function() {
        if (!initialized) {
            runs(function() {
                MockMslContext.create(EntityAuthenticationScheme.NONE, false, {
                    result: function(c) { ctx = c; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                });
            });
            waitsFor(function() { return ctx; }, "ctx", 1200);
            runs(function() {
                encoder = ctx.getMslEncoderFactory();
                ctx.addEntityAuthenticationFactory(factory);
                initialized = true;
            });
        }
    });
    
    afterEach(function() {
        authutils.reset();
    });
    
    it("createData", function() {
        var data = new UnauthenticatedAuthenticationData(UNAUTHENTICATED_ESN);
        var entityAuthMo;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { entityAuthMo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return entityAuthMo; }, "entityAuthMo", 100);

        var authdata;
        runs(function() {
            factory.createData(ctx, entityAuthMo, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var dataMo, authdataMo;
        runs(function() {
            expect(authdata).not.toBeNull();
            expect(authdata instanceof UnauthenticatedAuthenticationData).toBeTruthy();
            
            MslTestUtils.toMslObject(encoder, data, {
                result: function(x) { dataMo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
            MslTestUtils.toMslObject(encoder, authdata, {
                result: function(x) { authdataMo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return dataMo && authdataMo; }, "dataMo && authdataMo", 100);

        runs(function() {
            expect(MslEncoderUtils.equalObjects(dataMo, authdataMo)).toBeTruthy();
        });
    });
    
    it("encode exception", function() {
        var entityAuthMo;
        runs(function() {
        	var data = new UnauthenticatedAuthenticationData(UNAUTHENTICATED_ESN);
        	data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { entityAuthMo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return entityAuthMo; }, "entityAuthMo", 100);
        
        var exception;
        runs(function() {
            entityAuthMo.remove(KEY_IDENTITY);
            factory.createData(ctx, entityAuthMo, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);
        
        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    it("crypto context", function() {
        var data = new UnauthenticatedAuthenticationData(UNAUTHENTICATED_ESN);
        var cryptoContext = factory.getCryptoContext(ctx, data);
        expect(cryptoContext).not.toBeNull();
    });
    
    it("not permitted", function() {
        var f = function() {
            authutils.disallowScheme(UNAUTHENTICATED_ESN, EntityAuthenticationScheme.NONE);
            var data = new UnauthenticatedAuthenticationData(UNAUTHENTICATED_ESN);
            factory.getCryptoContext(ctx, data);
        };
        expect(f).toThrow(new MslEntityAuthException(MslError.INCORRECT_ENTITYAUTH_DATA));
    });
    
    it("revoked", function() {
        var f = function() {
            authutils.revokeEntity(UNAUTHENTICATED_ESN);
            var data = new UnauthenticatedAuthenticationData(UNAUTHENTICATED_ESN);
            factory.getCryptoContext(ctx, data);
        };
        expect(f).toThrow(new MslEntityAuthException(MslError.ENTITY_REVOKED));
    });
});