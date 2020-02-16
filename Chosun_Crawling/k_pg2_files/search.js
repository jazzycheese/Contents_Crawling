var Search = function () {
    this.$searchForm = $(".search-key");

    this.$searchKey = $("#total-search-key");

    this.$suggestsWrap = $("#suggests-wrap .suggest-list");
    this.suggestKeywods = [];
    this.suggestKeywodsTemplate = Handlebars.getTemplate("search/suggests");

    this.hasForm = !$("#is-sub-layout").val();

    this.getSuggestKeywords("", true);

    this.initEvent();

    this.detailSearch = new DetailSearch();
}

Search.STEP_NETWORK = "relationship-network";

Search.prototype.getSuggestKeywords = function(keyword, isInit) {
    var self = this;

    var exceptDelimiters = [" OR ", " AND ", " NOT ", "\"", ","];
    var hasExceptDelimiter = false;

    self.suggestKeywods = [];

    if (keyword) {
        _.forEach(exceptDelimiters, function(delimiter) {
            if (keyword.indexOf(delimiter) >= 0) {
                hasExceptDelimiter = true;
            }
        });

        if (!hasExceptDelimiter) {
            $.getJSON("/api/search/suggestKeywords.do", { keyword: keyword || "" }, function(keywords) {
                self.suggestKeywods = keywords;

                _.forEach(self.suggestKeywods, function(keyword) {
                    if(keyword.TYPE == "PS") { keyword.TYPE_ALIAS = "인물"; }
                    else if(keyword.TYPE == "OG") { keyword.TYPE_ALIAS = "기관"; }
                    else if(keyword.TYPE == "PR") { keyword.TYPE_ALIAS = "상품"; }
                    else if(keyword.TYPE == "EV") { keyword.TYPE_ALIAS = "이벤트"; }
                    else if(keyword.TYPE == "LC") { keyword.TYPE_ALIAS = "장소"; }
                    else if(keyword.TYPE == "PL") { keyword.TYPE_ALIAS = "정책"; }
                    else { keyword.TYPE_ALIAS = keyword.TYPE; }
                });

                self.showSuggest(isInit);
            });
        }
    }
}

Search.prototype.setDetail = function(detailSearch) {
    this.detailSearch = detailSearch;
}

Search.prototype.setValuesByParams = function(searchParams) {
    var self = this;

    if (searchParams) {
        self.$searchKey.val(searchParams.searchKey);
        $("#total-search-key-copy").val(searchParams.searchKey);
        
        $("#orKeyword1").val(searchParams.orKeyword);
        $("#andKeyword1").val(searchParams.andKeyword);
        $("#exactKeyword1").val(searchParams.exactKeyword);
        $("#notKeyword1").val(searchParams.notKeyword);
        
        if (searchParams.byLine) {
            $("#byline").val(searchParams.byLine);
        }
        if (searchParams.networkNodeType) {
            $("#networkNodeType").val(searchParams.networkNodeType);
        }
        self.detailSearch.setSearchDetails(searchParams);

        if (searchParams.step) {
            self.currentStep = searchParams.step;
        }
    }
}

Search.prototype.getSearchParams = function() {
    return this.detailSearch.getFormData();
}

Search.prototype.search = function() {
    var formData = {};
    formData = _.assign(formData, this.detailSearch.getFormData());
    $("#search-form-data").val(JSON.stringify(formData));

    if (this.hasForm) {
        if (!formData.searchKey) {
            if (formData.searchKeys) {
                var detailSearchKeys = formData.searchKeys[0];

                if (!detailSearchKeys.orKeywords
                    && !detailSearchKeys.andKeywords
                    && !detailSearchKeys.exactKeywords
                    && detailSearchKeys.notKeywords) {

                    alert("제외 키워드는 단독으로 이용할 수 없습니다. \n기본 검색어 또는 다른 상세 키워드를 입력 후 검색하시기 바랍니다.");
                    return false;
                }
            }
        }
        $("#news-search-form")[0].submit();
    }
}

Search.prototype.showSuggest = function(isInit) {
    var self = this;

    var suggestsHtml = self.suggestKeywodsTemplate({
        keywords: self.suggestKeywods
    });

    self.$suggestsWrap.html(suggestsHtml);

    if (!isInit && self.suggestKeywods.length) {
        self.visibleSuggest();
    } else {
        self.inVisibleSuggest();
    }
}

Search.prototype.inVisibleSuggest = function() {
    $(".suggest-list").removeClass("focused");
}

Search.prototype.visibleSuggest = function() {
    $(".suggest-list").addClass("focused");
}

Search.prototype.checkStep = function() {
    var self = this;

    if (self.currentStep) {
        if (self.currentStep == Search.STEP_NETWORK) {
            $("#analytics-network-tab").trigger("click");
        }
    }
}

Search.prototype.initEvent = function () {
    var self = this;

    $(document).on("click", ".keyword-item", function(e) {
        e.preventDefault();

        var index = $(this).data("index");
        var selectedKeyword = self.suggestKeywods[index];

        $("#total-search-key").val(selectedKeyword.searchQuery);
        self.inVisibleSuggest();
    });

    self.$searchForm.focus(function(e) {
        if (self.suggestKeywods.length) {
            self.visibleSuggest();
        }
    });

    self.$searchForm.focusout(function(e) {
        setTimeout(function () {
            self.inVisibleSuggest();
        }, 500);
    });

    self.$searchForm.keyup(function(e) {
        var searchKey = $(this).val();
        self.getSuggestKeywords(this.value);

        if ((searchKey.match(/\(/g) || []).length != (searchKey.match(/\)/g) || []).length) {
            $(".keyword-warning-btn").removeClass("hidden");
        } else {
            $(".keyword-warning-btn").addClass("hidden");
        }
    });

    $(".details-search-btn").click(function(e) {
        $("#advanced-search-options").toggleClass("active");
    });

    self.$searchKey.keypress(function(e) {
        var currentChar = String.fromCharCode(e.which);
        var currentKeyword = $(this).val() + currentChar;

        // var fullSearchKey = self.detailSearch.getFullKeyword();

        if(e.keyCode == 13) {
            e.preventDefault();
            self.search();
        }
        /*
        else if (fullSearchKey && fullSearchKey != currentKeyword) {

            e.preventDefault();

            if (confirm("기존에 진행중인 상세검색 옵션을 삭제하고 직접입력을 수행하시겠습니까?")) {
                self.fullSearchKey = null;
                self.searchKeys = [];
                $("#total-search-key").val(currentChar);
                self.renderSearchKeys();
            }
        }
        */
    });


    $(".copy-btn").click(function(e) {
        var copyResult = copyToClipboard(document.getElementById("beutify-search-text"), "beutify-search-text-wrap");
        if (copyResult) {
            var $msg = $("#copy-complete-msg");
            $msg.removeClass("hidden");
            setTimeout(function(){ $msg.addClass("hidden"); }, 1500);
        }
    });

    $(".keyword-warning-btn").click(function(e) {
        var searchKey = $("#total-search-key").val();
        var formattedKey = sqlFormatter.format(searchKey, {language: "sql"});

        var openCnt = 0;

        var results = [];
        _.forEach(formattedKey.split("\n"), function (rowText) {
            if (openCnt > 0) {
                for(var i = 0; i < openCnt; i++) {
                    rowText = "<span class='empty-tab'></span>" + rowText;
                }
            }
            rowText = rowText.replace(" OR ", "<span class='or-text'> OR </span>");
            rowText = rowText.replace(" AND ", "<span class='and-text'> AND </span>");
            rowText = rowText.replace(" NOT ", "<span class='not-text'> NOT </span>");
            rowText = rowText.replace("\"", "<span class='exact-text'>\"</span>");

            if (rowText.indexOf("(") >= 0) {
                openCnt++;
            }

            if (rowText.indexOf(")") >= 0) {
                openCnt--;
            }
            results.push(rowText);
        });

        $("#beutify-search-text").html(results.join("\n"));
        $("#keyword-warning-modal").modal("show");
    });

    $(".news-search-btn").click(function(e) {
        e.preventDefault();
        self.search();
    });

    $("button[data-type=search-helper-show]").on("click", function(e) {
        e.preventDefault();

        $(".search-helper").css("visibility", "visible");
    });

    $("button[data-type=search-helper-hidden]").on("click", function(e) {
        e.preventDefault();

        $(".search-helper").css("visibility", "hidden");
    });

    if (!isMobileSize()) {
        $(".search-helper").draggable();
    } else {
        var content_height = $(window).height() - 54;
        $(".search-helper .content").css("height", content_height + "px");
    }


    $("#total-search-key-copy").keyup(function(e) {
        e.preventDefault();

        self.$searchKey.val($(this).val());
    });

    self.$searchKey.keyup(function(e) {
        $("#total-search-key-copy").val($(this).val());
    });
    
    //기간, 상세검색 드롭다운 클릭 시 이벤트.
    $("#detail-filter-div, #date-filter-div").on("click",function(e) {
    	console.log($(e.target));
    	console.log($(e.target).context.id);
    	
    	var closeTargetId = "detail-filter-btn|date-filter-btn|date-confirm-btn";
    	
        if($(e.currentTarget).hasClass("open") && $(e.target).context.id != "" && closeTargetId.indexOf($(e.target).context.id) > -1){
        	$(e.currentTarget).toggleClass("open",false);
        	
        }else{
        	if($(e.target).context.id == "search-filter-refresh" || $(e.target).context.id == "date-confirm-btn"){
        		//검색조건 새로 고침
        		$("#detail-filter-div").toggleClass("open",false);
        		$("#date-filter-div").toggleClass("open",false);
        		
        	}else{
        		$("#detail-filter-div").toggleClass("open",false);
        		$("#date-filter-div").toggleClass("open",false);
        		$(e.currentTarget).toggleClass("open",true);
        	}
//       	
//      	if($(e.target).context.id == "search-filter-refresh"){
//      		//검색조건 새로 고침
//      		$("#detail-filter-div").toggleClass("open",false);
//      		$("#date-filter-div").toggleClass("open",false);
//      		
//      	}else if($(e.target).context.id != "date-confirm-btn"){
//      		
//      		var t = "";
//      		t = $(e.currentTarget).context.id == "date-filter-div" ? "#detail-filter-div" : "#date-filter-div";
//      		$(e.currentTarget).toggleClass("open",true);
//      		$(t).toggleClass("open",false);
//      		
//      	}else{
//      		$(e.currentTarget).toggleClass("open",false);
//      	}
//      	
//        
        } 

        //e.preventDefault(); 
        //return false;
    });
    
    //[상세검색 영역]기간, 상세검색 드롭다운 자동 닫힘 이벤트 중지
    $("#detail-filter-div, #date-filter-div").on("hide.bs.dropdown", function(e){
    	var existStep1 = $("#collapse-step-1").length > 0 ? true : false; //Step01 뉴스검색 영역 존재여부
    	var existStep2 = $("#collapse-step-2").length > 0 ? true : false; //Step02 검색 결과 영역 존재여부
    	var isExpandedStep2 = $("#collapse-step-2").hasClass("in") ? true : false; //Step02 확장 여부
    	
    	if(existStep1 && existStep2 && isExpandedStep2){
    		//검색결과 화면이고 Step02가 확장되어 있는 경우
    	}else{
    		//메인화면이거나 검색결과 화면에서 Step02가 접혀있는 경우
    		e.preventDefault(); 
    		return false;
    	}
    });
        
    //[상세검색 영역]기간, 상세검색 드롭다운 닫을때 이벤트 중지
    $("#detail-filter-div, #date-filter-div").on("show.bs.dropdown", function(e){
    	e.preventDefault(); 
        return false;
    });
    
    //다른 필터탭을 열기위해 드롭다운 버튼을 클릭한 경우, 자동으로 닫히지 않는 탭을 닫도록 처리. 
    $("#total-search-key, #incident-filter-btn, #category-filter-btn, #provider-filter-btn, #date-confirm-btn").on("click",function(e) {
        if($("#detail-filter-div").hasClass("open")){
        	$("#detail-filter-div").toggleClass("open",false);
        }
        
        if($("#date-filter-div").hasClass("open")){
        	$("#date-filter-div").toggleClass("open",false);
        }
    });
    
}