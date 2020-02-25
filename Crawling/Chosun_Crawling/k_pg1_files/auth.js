var authManager = (function($, _, h) {
    var AuthManager = function() {
        this.account = null;

        this.$loginId = $("#login-user-id");
        this.$loginPassword = $("#login-user-password");

        this.$loginModal = $("#login-modal");
        this.$rememberMe = this.$loginModal.find("#remember-user-id");
        this.$loginModalBtn = $(".login-modal-btn");
        this.$loginBtn = $(".login-btn");
        this.$errorWrap = $("#login-error-msg");

        this.isValidId = this.isValidPassword = this.isValidName = this.isValidMobile = false;

        this.$signupModal = $("#signup-modal");
        this.$signupModalBtn = $(".signup-modal-btn");
        this.$signupForm = $("#signup-form");
        this.$signupFormBtn = this.$signupForm.find(".signup-form-btn");
        this.$signupBtn = this.$signupForm.find(".signup-btn");
        this.$agree1 = this.$signupForm.find("#agree1");
        this.$agree2 = this.$signupForm.find("#agree2");
        this.$agreeAll = this.$signupForm.find("#agree-all");
        this.$birthForm = this.$signupForm.find(".birthday-form");
        this.$birthForm.datetimepicker({
            defaultDate: moment().subtract(20, 'years'),
            format: 'YYYY-MM-DD',
            viewMode: "years"
        });

        this.$signupId = this.$signupForm.find("#user-id");
        this.$signupIdMsg = this.$signupForm.find("#signup-user-id-msg");
        this.$signupPassword = this.$signupForm.find("#user-password");
        this.$signupPasswordMsg = this.$signupForm.find("#signup-user-password-msg");
        this.$signupPasswordConfirmation = this.$signupForm.find("#user-password-confirmation");
        this.$signupName = this.$signupForm.find("#user-name");
        this.$signupNameMsg = this.$signupForm.find("#user-name-msg");
        this.$signupErrorMsgs = this.$signupForm.find("#signup-error-msgs");
        this.$signupMobile = this.$signupForm.find("#user-mobile");
        this.$signupMobileMsg = this.$signupForm.find("#user-mobile-msg");

        this.$findIdModal = $("#find-id-modal");
        this.$findIdModalBtn = $(".find-id-modal-btn");
        this.$findIdBtn = $("#find-id-btn");
        this.$findIdLabel = $("#find-id-label");
        this.findIdTemplate =  Handlebars.getTemplate("findId/results");
        this.$findIdInLoginBtn = $("#find-id-in-login-btn");

        this.$findPasswordModal = $("#find-password-modal");
        this.$findPasswordModalBtn = $(".find-password-modal-btn");
        this.$findPasswordBtn = $("#find-password-btn");
        this.$findPasswordMsg = $("#find-password-message");
        this.$findPasswordErrorMsg = $("#find-password-error-mgs");

        this.$mypageBtn = $(".mypage-btn");
        this.$logoutBtn = $(".logout-btn");
        this.$cancelBtn = $(".cancel-btn");

        this.$signupConfirmModal = $("#signup-complete-modal");

        this.$spinnerBox = $(".spinner-box");
        this.spinnerTemplate =  Handlebars.getTemplate("spinners/cube");

        this.$callbackElement = null;
        this.initEvents();
    }

    AuthManager.prototype.openLoginModal = function() {
        var loginUserId = localStorage.getItem('loginUserId');

        if (loginUserId) {
            this.$loginId.val(loginUserId);
            this.$rememberMe.prop("checked", true);
            this.$loginPassword.focus();
        } else {
            this.$loginId.focus();
        }

        this.$loginModal.modal();
    }

    AuthManager.prototype.login = function() {
        var self = this;
        var hasError = false;
        var errorMsg = "";

        var accountForm = {
            userId: self.$loginId.val(),
            userPassword: self.$loginPassword.val()
        };

        if (!accountForm.userId) {
            hasError = true;
            errorMsg = "사용자 아이디(Email)은 필수입니다.";
        } else if (!checkEmailForm(accountForm.userId)) {
            hasError = true;
            errorMsg = "사용자 아이디는 이메일 주소 형태로 입력해야 합니다.";
        }

        if (!accountForm.userPassword) {
            hasError = true;
            errorMsg = "사용자 비밀번호는 필수입니다.";
        }

        if (self.$rememberMe.is(":checked")) {
            localStorage.setItem('loginUserId', accountForm.userId);
        } else {
            localStorage.removeItem('loginUserId');
        }

        if (!hasError) {
            $.ajax({
                url: _contextPath + "/api/account/signin.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(accountForm),
                dataType: "json",
                success: function(data) {
                    self.$errorWrap.hide();
                    self.$loginModal.modal("hide");

                    self.setAuth(data);
                    
                    if(self.$callbackElement != null){
                    	self.$callbackElement.click();
                    	self.$callbackElement = null;
                    }
                },
                error: function(xhr, status, error) {
                    self.printErrors(xhr.responseJSON.message);
                    console.log(xhr);
                    if (xhr.status == 403) $(".resend-btn").removeClass("hidden");
                }
            });
        } else {
            self.printErrors(errorMsg);
        }
    }

    AuthManager.prototype.setAuth = function(account) {
        this.account = account;
 
        this.$signupModalBtn.removeClass("active");
        this.$loginModalBtn.removeClass("active");

        this.$mypageBtn.addClass("active");
        this.$logoutBtn.addClass("active");

        // 비회원 정책 적용
        $(".trend-daily-btn").addClass("selectable");
        $(".ignore-checkbox").prop("disabled", false);
        $(".checkbox-cancel").attr('data-original-title', '분석 제외');
        if (document.getElementById("weekend-search-date")) {
        	if($("#weekend-search-date").data('DateTimePicker') != undefined){
        		$("#weekend-search-date").data('DateTimePicker').minDate(0);
        	}
        }
    }

    AuthManager.prototype.printErrors = function(msg) {
        this.$errorWrap.text(msg);
        this.$errorWrap.show();
    }

    AuthManager.prototype.checkAgreements = function(ele, isAll) {
        var self = this;
        var $checkBox = $(ele);
        if (isAll) {
            var checked = $checkBox.is(":checked");

            self.$agree1.prop("checked", checked);
            self.$agree2.prop("checked", checked);
        } else {
            var checked = self.$agree1.is(":checked") && self.$agree2.is(":checked");
            self.$agreeAll.prop("checked", checked);
        }
    }

    AuthManager.prototype.hasAgreements = function() {
        return this.$agreeAll.is(":checked");
    }

    AuthManager.prototype.signupCheckId = function() {
        var self = this;
        self.isValidId = false;

        var userId = self.$signupId.val();

        if (checkEmailForm(userId)) {
            $.ajax({
                url: _contextPath + "/api/account/checkEmail.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({userId: userId}),
                success: function(isNewUser) {
                    if (isNewUser) {
                        self.$signupIdMsg.removeClass("point-text");
                        self.$signupIdMsg.addClass("primary-text");
                        self.$signupIdMsg.text("사용 가능한 주소입니다.");

                        self.isValidId = true;
                    } else {
                        self.$signupIdMsg.removeClass("primary-text");
                        self.$signupIdMsg.addClass("point-text");
                        self.$signupIdMsg.text("이미 사용중인 주소 입니다.");
                    }
                }
            })
        } else {
            self.$signupIdMsg.removeClass("primary-text");
            self.$signupIdMsg.addClass("point-text");
            self.$signupIdMsg.text("이메일 양식에 맞춰 기입해주시기 바랍니다. 이메일 아이디에는 '-', '_', '.'를 제외한 특수문자가 입력될 수 없습니다.");
        }
    }

    AuthManager.prototype.signupCheckPassword = function() {
        var self = this;
        self.isValidPassword = false;

        var password = self.$signupPassword.val();
        if (password && password.length >= 8 && checkPasswordForm(password)) {
            var passwordConfirm = self.$signupPasswordConfirmation.val();
            if (password != passwordConfirm) {
                self.$signupPasswordMsg.removeClass("primary-text");
                self.$signupPasswordMsg.addClass("point-text");
                self.$signupPasswordMsg.text("비밀번호와 비밀번호 확인은 동일하게 입력해야 합니다.");
            } else {
                self.$signupPasswordMsg.addClass("primary-text");
                self.$signupPasswordMsg.removeClass("point-text");
                self.$signupPasswordMsg.text("이용가능한 비밀번호 입니다.");

                self.isValidPassword = true;
            }
        } else {
            self.$signupPasswordMsg.removeClass("primary-text");
            self.$signupPasswordMsg.addClass("point-text");
            self.$signupPasswordMsg.text("최소 8자 이상 영문/숫자 혼합으로 설정하시기 바랍니다.");
        }
    }

    AuthManager.prototype.signupCheckName = function() {
        var self = this;
        self.isValidName = false;

        var name = self.$signupName.val().trim();
        if (name && checkNameForm(name)) {
            self.$signupNameMsg.addClass("primary-text");
            self.$signupNameMsg.removeClass("point-text");
            self.$signupNameMsg.text("올바른 이름 형식입니다.");

            self.isValidName = true;
        } else {
            self.$signupNameMsg.removeClass("primary-text");
            self.$signupNameMsg.addClass("point-text");
            self.$signupNameMsg.text("글자만 입력하시기 바랍니다.");
        }
    }

    AuthManager.prototype.signupCheckMobile = function() {
        var self = this;
        self.isValidMobile = false;

        var mobile = self.$signupMobile.val();
        if (mobile && checkMobileForm(mobile) && checkMobileLength(mobile)) {
            mobile = self.autoFillHyphen(mobile);

            self.$signupMobileMsg.addClass("primary-text");
            self.$signupMobileMsg.removeClass("point-text");
            self.$signupMobileMsg.text("사용가능한 연락처입니다.");

            self.isValidMobile = true;
            self.validMobileNumber = mobile;
        } else {
            self.$signupMobileMsg.removeClass("primary-text");
            self.$signupMobileMsg.addClass("point-text");
            self.$signupMobileMsg.text("잘못된 연락처 형식입니다.");
        };
    }

    AuthManager.prototype.autoFillHyphen = function(mobile) {
        if (mobile.length == 10) {
            mobile = mobile.replace(/(\d{3})\-?(\d{3})\-?(\d{4})/,'$1-$2-$3')
        } else if (mobile.length == 11){
            mobile = mobile.replace(/(\d{3})\-?(\d{4})\-?(\d{4})/,'$1-$2-$3')
        }

        return mobile;
    }

    AuthManager.prototype.signup = function() {
        var self = this;
        var errorMsgs = [];

        var account = getFormData(self.$signupForm);

        if (!$("#user-oauth-id").length) {
            if (!self.isValidId) {
                errorMsgs.push("이메일 주소를 확인하시기 바랍니다.");
            }

            if (!self.isValidPassword) {
                errorMsgs.push("비밀번호를 확인하시기 바랍니다.");
            }
        }

        if (!self.isValidName) {
            errorMsgs.push("이름을 확인하시기 바랍니다.");
        }

        if (!self.isValidMobile) {
            errorMsgs.push("연락처를 확인하시기 바랍니다.");
        }

        if (!account.userDiv) {
            errorMsgs.push("직군은 필수입력 항목입니다.");
        }

/*        if (!account.userCorp) {
            errorMsgs.push("소속은 필수입력 항목입니다.");
        }*/

        if (!self.hasAgreements()) {
            errorMsgs.push("이용약관과 개인정보 수집 및 이용에 동의해주시기 바랍니다.");
        }

        if (!errorMsgs.length) {
            account.userMobile = self.validMobileNumber;
            self.$signupBtn.attr("disabled", true);

            $.ajax({
                url: _contextPath + "/api/account/signup.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(account),
                success: function(d) {
                    if (d) {
                        if (d.userConfirm) {
                            location.href = "/";
                        } else {
                            $("#signup-step3-user-id").text(d.userId);
                            self.$signupConfirmModal.modal();
                        }
                    }
                },
                error: function(xhr, status, error) {
                    console.log(xhr);
                }
            });
        } else {
            self.printSignupErrors(errorMsgs);
        }
    }

    AuthManager.prototype.printSignupErrors = function(msgs) {
        var self = this;

        self.$signupErrorMsgs.html("");
        _.forEach(msgs, function (m) {
            var $msgDiv = $("<div>", {
                class: "point-text mb-1",
                text: m
            });

            self.$signupErrorMsgs.append($msgDiv);
        });
    }

    AuthManager.prototype.logout = function() {
        $.ajax({
            url: _contextPath + "/api/account/logout.do",
            type: "GET",
            success: function(d) {
                if (d) {
                    location.href = "/";
                }
            },
            error: function(xhr, status, error) {
                console.log(xhr);
            }
        });
    }

    AuthManager.prototype.checkAuth = function() {
        if (!this.account) {
            alert("로그인이 필요한 서비스 입니다.");
            hideModal();
            this.openLoginModal();

            return false;
        } else {
            return true;
        }
    }

    AuthManager.prototype.hasAuth = function() {
        return this.account;
    }

    AuthManager.prototype.clear = function() {
        var self = this;
        self.$loginPassword.val("");
        self.$agree1.prop("checked", false);
        self.$agree2.prop("checked", false);
        self.$agreeAll.prop("checked", false);
        self.$signupForm[0].reset();
        self.$callbackElement = null;
    }

    AuthManager.prototype.initEvents = function () {
        var self = this;

        self.$loginBtn.click(function(e) {
            self.login();
        });

        self.$loginPassword.keypress(function(e) {
            if (e.which == 13) {
                self.login();
            }
        });

        $(document).on("click", "#logout-btn", function(e) {
            e.preventDefault();

            location.href = _contextPath + "/v2/account/logout.do";
        });

        self.$cancelBtn.click(function(e) {
           self.clear();
        });

        self.$agree1.change(function(e) { self.checkAgreements(this); });
        self.$agree2.change(function(e) { self.checkAgreements(this); });
        self.$agreeAll.change(function(e) { self.checkAgreements(this, true); });

        self.$signupFormBtn.click(function(e) {
            if (self.hasAgreements()) {
                self.$signupForm[0].reset();
            } else {
                alert("이용약관과 개인정보 수집 및 이용에 동의해주시기 바랍니다.");
            }
        });

        self.$signupId.keyup(function(e) {
            self.signupCheckId();
        });
        self.$signupPassword.keyup(function(e) { self.signupCheckPassword(); });
        self.$signupPasswordConfirmation.keyup(function(e) { self.signupCheckPassword(); });
        self.$signupName.keyup(function(e) { self.signupCheckName(); });
        self.$signupMobile.keyup(function(e) {
            self.signupCheckMobile();
        });

        self.$signupBtn.click(function(e) {
            self.signup();
        });

        self.$signupConfirmModal.on('hidden.bs.modal', function (e) {
            location.href = "/";
        });

        self.$findIdModalBtn.click(function(e) {
            hideModal();

            self.$findIdBtn.show();
            self.$findIdLabel.text("");
            self.$findIdInLoginBtn.hide();

            self.$findIdModal.modal();
        });

        self.$findPasswordModalBtn.click(function(e) {
            hideModal();

            self.$findPasswordModal.modal();
        });

        self.$findIdBtn.click(function(e) {
            var hasError = false;
            var errorMsg = "";

            var userName = $("#find-user-name").val();
            var userMobile = $("#find-user-mobile").val();

            if (!userName) {
                hasError = true;
                errorMsg = "사용자 이름은 필수입니다.";
            }

            if (!userMobile) {
                hasError = true;
                errorMsg = "사용자 연락처 입력은 필수입니다."
            } else if (!checkMobileForm(userMobile)) {
                hasError = true;
                errorMsg = "숫자만 입력하시기 바랍니다."
            } else if (!checkMobileLength(userMobile)) {
                hasError = true;
                errorMsg = "잘못된 연락처 형식입니다."
            }

            if (!hasError) {
                var account = {
                    userName: userName,
                    userMobile: self.autoFillHyphen(userMobile)
                };

                $.ajax({
                    url: _contextPath + "/api/account/findId.do",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(account),
                    success: function(results) {
                        if (!_.isEmpty(results)) {
                            var findIdHtml = self.findIdTemplate({results: results});
                            self.$findIdLabel.html(findIdHtml);

                            self.$findIdBtn.hide();
                            self.$findIdInLoginBtn.show();
                        } else {
                            self.$findIdLabel.text("검색된 ID가 없습니다.");
                        }
                    },
                    error: function(err) {
                        console.log(err);
                    }
                });
            } else {
                self.$findIdLabel.text(errorMsg);
                // alert("사용자 이름과 연락처는 필수 입력 사항입니다.");
            }
        });

        self.$findPasswordBtn.click(function(e) {
            var hasError = false;
            var errorMsg = "";

            var userId = $("#find-password-id").val();
            var userName = $("#find-password-name").val();
            var userMobile = $("#find-password-mobile").val();

            if (!userId) {
                hasError = true;
                errorMsg = "사용자 아이디(Email)은 필수입니다.";
            } else if (!checkEmailForm(userId)) {
                hasError = true;
                errorMsg = "사용자 아이디는 이메일 주소 형태로 입력해야 합니다.";
            }

            if (!userName) {
                hasError = true;
                errorMsg = "사용자 이름은 필수입니다.";
            }

            if (!userMobile) {
                hasError = true;
                errorMsg = "사용자 연락처 입력은 필수입니다."
            } else if (!checkMobileForm(userMobile)) {
                hasError = true;
                errorMsg = "숫자만 입력하시기 바랍니다."
            } else if (!checkMobileLength(userMobile)) {
                hasError = true;
                errorMsg = "잘못된 연락처 형식입니다."
            }

            if (!hasError) {
                self.$findPasswordErrorMsg.hide();
                self.$spinnerBox.html(self.spinnerTemplate);
                self.$spinnerBox.show();

                var account = {
                    userId: userId,
                    userName: userName,
                    userMobile: self.autoFillHyphen(userMobile)
                };

                $.ajax({
                    url: _contextPath + "/api/account/findPassword.do",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(account),
                    success: function(d) {
                        if (d) {
                            self.$findPasswordMsg.find("span").text(d);
                            self.$findPasswordMsg.show();
                            self.$spinnerBox.hide();
                        }
                    },
                    error: function(xhr, status, error) {
                        self.$findPasswordErrorMsg.text(xhr.responseJSON.message);
                        self.$findPasswordErrorMsg.show();
                        self.$spinnerBox.hide();
                    }
                });
            } else {
                self.$findPasswordErrorMsg.text(errorMsg);
                self.$findPasswordErrorMsg.show();
            }
        });

        $(document).on("click", ".login-modal-btn", function(e) {
            e.preventDefault();
            hideModal();
            if(self.account) {
                alert("이미 로그인하셨습니다.");
                return false;
            }
            self.openLoginModal();
        });

        $(document).on("click", ".signup-modal-btn", function(e) {
            e.preventDefault();
            hideModal();
            if(self.account) {
                alert("이미 가입하셨습니다.");
                return false;
            }
            self.$signupModal.modal();

        });

        $(document).on("click", ".btnAgreeCheck", function(e) {
            e.preventDefault();
            var $e = $(this);
            self.$callbackElement = $(".footer-link[data-type=policy]");
            if (self.checkAuth()) {
            	var objs = new Object();
        		objs.USER_SN = authManager.account.userSn;
            	$.ajax({
                    url: _contextPath + "/member/selectIsInfoAgreeTarget.do",
                    type: "POST",
                    contentType: "application/json",
                    data: objs,
                    success: function(d) {
                    	if(d.result_cd == "200"){
                    		location.href = $e.data("url");
                    		hideModal();
        				}else{
        					alert("개인정보수집 재동의 대상이 아닙니다.");	
        				}
                    },
                    error: function(xhr, status, error) {
                        console.log(xhr);
                    }
                });
                //location.href = $(this).data("url");
            }else{
            	//$(".footer-link[data-type=policy]").click();
            }
        });

        $(".resend-btn").click(function(e) {
            e.preventDefault();
            var mode = $(this).data('mode');
            var account;
            if (mode == "signup") {
                account = {userId: self.$signupId.val()};
            } else {
                account = {userId: self.$loginId.val()};
            }

            $(this).prop("disabled", true);
            $.ajax({
                url: _contextPath + "/api/account/resendConfirmMail.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(account),
                success: function(d) {
                    $(".resend-mail-msg").html("전송 완료되었습니다. 이메일 인증을 완료해주세요.");
                },
                error: function(xhr, status, error) {
                    console.log(xhr);
                }
            });
        });

        $("#kakao-signup-btn").click(function(e) {
            e.preventDefault();
            hideModal();
            $("#kakao-signup-modal").modal();
        });
    }

    return new AuthManager();
})(jQuery, _, Handlebars);