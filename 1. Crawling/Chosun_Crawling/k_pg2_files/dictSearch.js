var DictSearch = function(search) {
    this.search = search;

    this.currentType = "texanomy";

    this.$texanomyListWrap = $("#dict-list-wrap");
    this.texanomyListTemplate = Handlebars.getTemplate("search/detail/dictList");
    this.sharedDictListTemplate = Handlebars.getTemplate("search/detail/sharedDictList");
    this.myDictListTemplate = Handlebars.getTemplate("search/detail/myDictList");
    this.myExpressionListTemplate = Handlebars.getTemplate("search/detail/myExpressionList");
    this.myExpressionDetailTemplate = Handlebars.getTemplate("search/detail/myExpressionDetail");
    this.thesaurusTemplate = Handlebars.getTemplate("search/detail/thesaurus");
    this.headwordsTemplate = Handlebars.getTemplate("search/detail/headwords");
    this.synonymTemplate = Handlebars.getTemplate("search/detail/thesaurusSynonyms");
    this.relatedWordsTemplate = Handlebars.getTemplate("search/detail/thesaurusRelatedWords");

    this.paginationTemplate = Handlebars.getTemplate("util/pagination");

    this.$loader = $(".dict-search__loader");

    this.getDict();
    this.initEvents();
}

DictSearch.HELPER_MESSAGES = {
    "texanomy": "텍사노미란, 단어 간 계층관계를 나타낸 분류체계를 의미합니다.<a  href=\"/dataFile/2016_news_bigdata_texanomy_dic_info.pdf\" target=\"_blank\" class=\"btn btn-xs ml-1 btn-default\">시소러스 및 텍사노미 사전 다운로드</a>",
    "shared": "빅카인즈 사용자들이 공유한 사전입니다.",
    "mydic": "나의사전에서는 내가 직접 구성한 사전을 이용하여 검색 할 수 있습니다."
}

DictSearch.prototype.getDict = function() {
    var self = this;

    if (self.currentType == "texanomy") {
        $(".dict-basic-option").show();
        $.ajax({
            url: "/news/getSearchDic.do",
            dataType: "json",
            method: "POST",
            data: { userSn: "" },
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            success: function(data){
                self.dictList = data.resultList;

                var texanomyListHtml = self.texanomyListTemplate({ dictList: self.dictList });
                self.$texanomyListWrap.html(texanomyListHtml);

                var firstDict = self.dictList[0];
                self.getDictTree(firstDict.PATH);
            }
        });
    } else if (self.currentType == "shared") {
        $(".dict-basic-option").show();
        
        $.ajax({
            url: "/news/shareDicSearch.do",
            dataType: "json",
            method: "POST",
            data: { userSn: "", p_page: 1 },
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            success: function(data){
                self.dictList = data.resultList;

                var sharedListHtml = self.sharedDictListTemplate({ dictList: self.dictList });
                self.$texanomyListWrap.html(sharedListHtml);

                $("#dict-tree-wrap").html("");
                self.$loader.hide();
            }
        });
    } else if (self.currentType == "thesaurus") {
        $(".dict-basic-option").hide();
        self.$texanomyListWrap.html(self.thesaurusTemplate());

        self.getThesaurusData();
    } else if (self.currentType == "mydic") {
        if (authManager.checkAuth()) {
            $(".dict-basic-option").show();

            $.ajax({
                url: "/api/mydic/index.do",
                contentType: "application/json",
                success: function(data) {
                    self.dictList = data;

                    var myDicListHtml = self.myDictListTemplate({ dictList: self.dictList });
                    self.$texanomyListWrap.html(myDicListHtml);

                    $("#dict-tree-wrap").html("");
                    self.$loader.hide();
                },
                error: function(err) {
                    console.log(err);
                }
            });
        }
    }
}

DictSearch.prototype.getThesaurusData = function() {
    var self = this;

    var params = {
        p_page: self.thesaurusPage || 1,
        thesSelect: self.thesaurusType || "All",
        thType: self.thesaurusCategory || "thesOpt_1"
    };

    if (self.thesaurusKeyword) {
        params.thKeyword = self.thesaurusKeyword;
    }

    $.ajax({
        url: "/news/thesaurusSearch.do",
        dataType: "json",
        method: "POST",
        data: params,
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        success: function(data){
            if (data && data.resultList && data.resultList.length) {
                self.thesaurusList = data.resultList;
                self.thesaurusTotalSize = data.resultCnt;
                self.renderHeadwords();
            } else {
                alert(self.thesaurusKeyword + "에 대한 데이터가 존재하지 않습니다.");
            }
        }, error: function(err) {
            console.log(err);
        }
    });
}

DictSearch.prototype.getThesaurusDetail = function(keyword) {
    var self = this;

    $.ajax({
        url: "/news/thesauruslevelTreeList.do",
        dataType: "json",
        method: "POST",
        data: { keyword: keyword },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        success: function(data){
            if (data && data.resultList) {
                self.thesaurusDetailItems = data.resultList;
            } else {
                self.thesaurusDetailItems = null;
            }

            self.renderThesaurusDetail();
        }, error: function(err) {
            console.log(err);
        }
    });
}

DictSearch.prototype.renderHeadwords = function() {
    var self = this;

    var headwords = self.thesaurusList.slice(0, 16);
    var headwordsHtml = self.headwordsTemplate({ headwords: headwords });

    $("#headword-list").html(headwordsHtml);

    var pageHtml = self.paginationTemplate({
        pagination: {
            page: self.thesaurusPage || 1,
            pageCount: parseInt(self.thesaurusTotalSize / 16)
        }
    });

    $("#headword-page").html(pageHtml);
}

DictSearch.prototype.renderThesaurusDetail = function() {
    var self = this;

    if (self.thesaurusDetailItems) {
        var thesaurusDetailItem = self.thesaurusDetailItems[0];
        if (thesaurusDetailItem.UF) {
            self.thesaurusSynonyms = thesaurusDetailItem.UF.split(",");
            var sysnonymsHtml = self.synonymTemplate({ synonyms: self.thesaurusSynonyms });

            $("#synonym-list").html(sysnonymsHtml);
        } else {
            $("#synonym-list").html("");
        }

        if (thesaurusDetailItem.RT) {
            self.thesaurusRelatedWords = thesaurusDetailItem.RT.split(",");
            var relatedWordsHtml = self.relatedWordsTemplate({ relatedWords: self.thesaurusRelatedWords });

            $("#related-word-list").html(relatedWordsHtml);
        } else {
            $("#related-word-list").html("");
        }
    } else {
        $("#synonym-list").html("");
        $("#related-word-list").html("");
    }
}

DictSearch.prototype.listToTree = function(list, idAlias, textAlias, parentId) {
    if (!parentId) {
        parentId = "UPPER_SN"
    }

    var map = {}, node, roots = [], i;
    for (i = 0; i < list.length; i += 1) {
        map[list[i][idAlias]] = i; // initialize the map
        list[i].children = []; // initialize the children
    }

    for (i = 0; i < list.length; i += 1) {
        node = list[i];
        node.text = node[textAlias];

        if (parseInt(node[parentId]) !== 0) {
            // if you have dangling branches check that map[node.UPPER_SN] exists
            list[map[node[parentId]]].children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

DictSearch.prototype.getDictTree = function(path) {
    var self = this;

    self.$loader.show();
    $.ajax({
        url: "/news/levelTreeList.do",
        dataType: "json",
        method: "POST",
        data: { path: path },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        success: function (data) {
            self.subDictList = data.resultList;
            var treeData = self.listToTree(data.resultList, "THESAURUS_SN", "THESAURUS_NAME");

            if (self.tree) {
                self.tree.destroy();
            }

            self.tree = $('#dict-tree-wrap').tree({
                primaryKey: 'THESAURUS_SN',
                uiLibrary: 'bootstrap',
                dataSource: treeData,
                checkboxes: true
            });

            self.$loader.hide();
        }
    });
}

DictSearch.prototype.getSharedDictTree = function(sn, userSn) {
    var self = this;

    self.$loader.show();
    $.ajax({
        url: "/news/getMyDicTreeSearch.do",
        dataType: "json",
        method: "POST",
        data: { dicSn: sn,  userSn: userSn},
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        success: function (data) {
            self.subDictList = data.resultList;
            var treeData = self.listToTree(data.resultList, "MY_DIC_DETAIL_SN", "MY_DIC_DETAIL_NAME");

            if (self.tree) {
                self.tree.destroy();
            }

            self.tree = $('#dict-tree-wrap').tree({
                primaryKey: 'MY_DIC_DETAIL_SN',
                uiLibrary: 'bootstrap',
                dataSource: treeData,
                checkboxes: true
            });

            self.$loader.hide();
        }
    });
}

DictSearch.prototype.getMyDictTree = function(dicSn) {
    var self = this;

    self.$loader.show();

    $.ajax({
        url: "/api/mydic/" + dicSn + "/customDicTree.do",
        contentType: "application/json",
        success: function (data) {
        	if(data.body.resultList.length == 0){
        		//텍사노미에 없는 사전 데이터인 경우 
        		self.subDictList = data.body.myDicDetails;
        	}else{
        		//텍사노미에 있는 사전 데이터인 경우
        		self.subDictList = data.body.resultList;
        	}
        	
            var treeData = self.listToTree(self.subDictList, "myDicDetailSn", "myDicDetailName", "upperSn");

            if (self.tree) {
                self.tree.destroy();
            }

            self.tree = $('#dict-tree-wrap').tree({
                primaryKey: 'myDicDetailSn',
                uiLibrary: 'bootstrap',
                dataSource: treeData,
                checkboxes: true
            });
            
            if(data.body.myDicDetails != null){
            	var nodeArr = [];
            	_.forEach(data.body.myDicDetails, function(e){
            		try {
            			//체크처리
            			self.tree.check(self.tree.getNodeByText(e.myDicDetailName));
					} catch (error) {
						//데이터 관리로 인해 누락된 구 데이터
						//console.log(e.myDicDetailName);
	            		//console.log(self.tree.getNodeByText(e.myDicDetailName));
					}
            		/*
            		if(e.path != null){
            			var temp = e.path.split('|');
            			//체크된 노드에 대한 expand를 위해 노드의 path 항목 집계
            			_.forEach(temp, function(o){
            				if(o != ""){
            					nodeArr.push(o);
            				}
            			});
            		}
            		*/
            	});
            	
            	//중복 제거
            	/*
            	nodeArr = Array.from(new Set(nodeArr));
            	_.forEach(nodeArr, function(v){
            		self.tree.expand(self.tree.getNodeById(v));
            	});
            	*/
            }
            self.$loader.hide();
        }
    });
}

DictSearch.prototype.initEvents = function() {
    var self = this;

    $("input[name='dict-type']").change(function(e) {
        var changedType = $(this).val();
        // self.currentType

        if (changedType == "mydic") {
            if (!authManager.account) {
                $("#dict-type-" + self.currentType).prop("checked", true);
                authManager.checkAuth();

                return false;
            }
        }

        self.currentType = changedType;

        if (DictSearch.HELPER_MESSAGES[self.currentType]) {
            var message = DictSearch.HELPER_MESSAGES[self.currentType];
            var helpMessageHtml = '<i class="fal fa-exclamation-circle"></i> ' + message;
            $("#dict-help-block").html(helpMessageHtml);
        } else {
            $("#dict-help-block").html("");
        }

        self.getDict();
    });

    $(".cancel-dict-option").click(function(e) {
        self.tree.uncheckAll();
    });

    $(".apply-dict-option").click(function(e) {
        var checkedIds = self.tree.getCheckedNodes();

        var idAlias = null;
        var titleAlias = null;
        if (self.currentType == "texanomy") {
            idAlias = "THESAURUS_SN";
            titleAlias = "THESAURUS_NAME";
        } else if (self.currentType == "shared" || self.currentType == "mydic") {
            idAlias = "myDicDetailSn";
            titleAlias = "myDicDetailName";
        }

        var dictValues = [];
        _.forEach(self.subDictList, function(subDictItem) {
            if (checkedIds.indexOf(parseInt(subDictItem[idAlias])) > -1) {
                dictValues.push("(" + subDictItem[titleAlias] + ")");

                if (self.currentType == "shared" && subDictItem.LOWER_THESAURUS) {
                    var thesaurus = [];
                    var lowerThesaurus = subDictItem.LOWER_THESAURUS.split(",");
                    _.forEach(lowerThesaurus, function(t) {
                        thesaurus.push("(" + t + ")");
                    });
                    dictValues.push(thesaurus.join(" OR "));
                }
            }
        });

        if (dictValues.length) {
            var searchKeyArr = [];
            var searchKey = $("#total-search-key").val();

            if (searchKey) {
                searchKeyArr.push(searchKey);
                searchKeyArr.push($("input[name='dict-concat']:checked").val());
            }

            var concatSearchKey = "(" + dictValues.join(" OR ") + ")";
            searchKeyArr.push(concatSearchKey);

            $("#total-search-key").val(searchKeyArr.join(" "));
        }

        $(".dropdown").removeClass("open");
    });

    $(document).on("click", ".add-to-my-dic-btn", function(e) {
    	
        if (authManager.checkAuth()) {
        	var dicUserCustomName =prompt('사전의 이름을 입력해주세요.');
        	
        	if(dicUserCustomName == ""){
        		alert("사전의 이름이 입력되지 않아 취소되었습니다.");
        	}else if(dicUserCustomName == null){
        		//취소버튼 클릭 시
        	}else{
        		var dicSubject = $(".dict-list option:selected").data("name");
        		var dicPath = $(".dict-list option:selected").data("path");
        		var tsArr = self.tree.getCheckedNodes();
        		
        		var dicData = {
        				dicKeyword: dicSubject,
        				dicSubject: dicUserCustomName,
        				dicPath: dicPath,
        				thesaurusSnArr: tsArr
        		};
        		
        		$.ajax({
        			//url: _contextPath + "/api/mydic/create.do",
        			url: _contextPath + "/api/mydic/createMyCustomDic.do",
        			type: "POST",
        			contentType: "application/json",
        			data: JSON.stringify(dicData),
        			success: function(data) {
        				if (data) {
        					if (data.message) {
        						alert(data.message);
        					} else {
        						alert("정상처리 되었습니다.");
        					}
        				}
        			}, error: function(err) {
        				console.log(err);
        			}
        		});
        	}
        }
    });

    $(document).on("click", ".add-shared-to-my-dic-btn", function(e) {
        if (authManager.checkAuth()) {
            var dicSn = $(".dict-list").val();

            if (dicSn) {
                var userSn = $(".dict-list option:selected").data("usersn");

                var dicData = {
                    dicSn: dicSn,
                    userSn: userSn
                };

                $.ajax({
                    url: _contextPath + "/api/mydic/create.do",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(dicData),
                    success: function(data) {
                        if (data) {
                            if (data.message) {
                                alert(data.message);
                            } else {
                                alert("정상처리 되었습니다.");
                            }
                        }
                    }, error: function(err) {
                        console.log(err);
                    }
                });
            } else {
                alert("사전을 먼저 선택하시기 바랍니다.");
            }
        }
    });

    $(document).on("change", ".dict-list", function(e) {
        if (self.currentType == "texanomy") {
        	var path = $(this).val();
        	self.getDictTree(path);
        } else if (self.currentType == "shared" || self.currentType == "mydic") {
        	var dicSn = $(this).val();
        	if (dicSn) {
        		self.getMyDictTree(dicSn);
        	}
        }
    });

    $(document).on("click", ".headword-initial", function(e) {
        e.preventDefault();

        $(".headword-initial").removeClass("active");
        $(this).addClass("active");

        self.thesaurusPage = 1;
        self.thesaurusType = $(this).data("word");

        self.getThesaurusData();
    });

    $(document).on("click", ".thesaurus-search-btn", function(e) {
        self.thesaurusKeyword = $("#thesaurus-key").val();
        self.thesaurusCategory = $("#thesaurus-search-category").val();

        if (self.thesaurusKeyword) {
            self.getThesaurusData();
        } else {
            alert("검색어를 입력하세요.");
        }
    });

    $(document).on("keyup", "#thesaurus-key", function(e) {
        e.stopPropagation();

        if (e.which == 13) {
            e.preventDefault();

            if ($("#thesaurus-key").val()) {
                self.getThesaurusData();
            } else {
                alert("검색어를 입력하세요.");
            }
        }
    });

    $(document).on("click", "#headword-page .page-link", function(e) {
        e.preventDefault();

        var page = $(this).data("page");
        self.thesaurusPage = page;
        self.thesaurusKeyword = null;

        self.getThesaurusData();
    });

    $(document).on("change", "input[name='headword']", function(e) {
        var keyword = $(this).val();

        self.thesaurusKeyword = null;
        self.getThesaurusDetail(keyword);
    });

    $(document).on("click", ".apply-thesaurus-btn", function(e) {
        var keyword = $("input[name='headword']:checked").val();

        if (keyword) {
            var totalSearchKey = $("#total-search-key").val();
            if (totalSearchKey) {
                totalSearchKey = "(" + totalSearchKey + ")";
                totalSearchKey += " OR ";
            }

            keyword = "(" + keyword + ")";

            var hasChild = false;
            var synonyms = [];
            _.forEach($("input[name='thesaurus-synonym']:checked"), function(synonym) {
                synonyms.push($(synonym).val());
            });
            var synonymConcat = $("input[name='synonym-concat']:checked").val();

            if (synonyms.length) {
                hasChild = true;
                keyword += synonymConcat + "(" + synonyms.join(" OR ") + ")";
            }

            var relatedWords = [];
            _.forEach($("input[name='thesaurus-related-word']:checked"), function(relatedWord) {
                relatedWords.push($(relatedWord).val());
            });
            var relatedWordConcat = $("input[name='related-wrap-concat']:checked").val();

            if (relatedWords.length) {
                hasChild = true;
                keyword += relatedWordConcat + "(" + relatedWords.join(" OR ") + ")";
            }

            if (hasChild) {
                keyword = "(" + keyword + ")";
            }

            totalSearchKey = totalSearchKey + keyword;

            $("#total-search-key").val(totalSearchKey);
            $(".dropdown").removeClass("open");
        }
    });
    
    $(document).on("click", "#thesaurusManual", function(e) {
    	$.ajax({
    		url: "/api/news/downloadLogging.do",
    		method: "POST",
    		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    		data: { categoryCode:"thesaurusManual"},
    		dataType: "json",
    		success: function(data) {
    			//console.log(data);
    		}
    	});
    });
    
    $('#detail-expression-tab').on('show.bs.tab', function (e) {
        if (authManager.checkAuth()) {
            if (self.expressionList) return;

            $.getJSON(_contextPath + "/api/private/expressions/index.do", {_: new Date().getTime()}, function(data) {
                self.expressionList = data;
                var expressionListHtml = self.myExpressionListTemplate({ expressionList: self.expressionList });

                $("#expression-list-wrap").html(expressionListHtml);
            });
        } else {
            e.preventDefault();
        }
    });

    $(document).on("change", "#my-expression-sn-list", function(e) {
        var srchformulaSaveSn = $(this).val();

        if (srchformulaSaveSn) {
            var expression = _.find(self.expressionList, function(expressionItem) {
                return expressionItem.srchformulaSaveSn == srchformulaSaveSn;
            });

            expression.startDate = moment(expression.searchStartDate).format("YYYY-MM-DD");
            expression.endDate = moment(expression.searchEndDate).format("YYYY-MM-DD");

            var expressionHtml = self.myExpressionDetailTemplate(expression);
            $("#expression-detail-wrap").html(expressionHtml);
        } else {
            $("#expression-detail-wrap").html("");
        }
    });

    $(".expression-search-btn").click(function(e) {
        var srchformulaSaveSn = $("#my-expression-sn-list").val();

        if (srchformulaSaveSn) {
            var expression = _.find(self.expressionList, function(expressionItem) {
                return expressionItem.srchformulaSaveSn == srchformulaSaveSn;
            });

            expression.startDate = moment(expression.searchStartDate).format("YYYY-MM-DD");
            expression.endDate = moment(expression.searchEndDate).format("YYYY-MM-DD");

            var searchParam = {
                indexName: expression.srchindex,
                searchKey: expression.srchwrd,
                searchKeys: [{}],
                searchFilterType: expression.searchFilter,
                searchScopeType: expression.searchType,
                startDate: expression.startDate,
                endDate: expression.endDate,
                byLine: "",
                mainTodayPersonYn: "",
                newsIds: []
            };

            if (expression.searchProviderCode) {
                searchParam.providerCodes = expression.searchProviderCode.split(",");
            }

            if (expression.searchCategoryPath) {
                searchParam.categoryCodes = expression.searchCategoryPath.split(",");
            }

            if (expression.searchIncidentCategoryPath) {
                searchParam.incidentCodes = expression.searchIncidentCategoryPath.split(",");
            }

            if (expression.exclusionNewsId) {
                searchParam.exceptNewsIds = expression.exclusionNewsId.split(",");
            }

            if (expression.filterSearchYear) {
                searchParam.dateCodes = expression.filterSearchYear.split(",");
            }

            $("input[name='jsonSearchParam']").val(JSON.stringify(searchParam));
            $("#news-search-form")[0].submit();
        } else {
            alert("선택 된 검색식이 없습니다.");
        }
    });
    
    $(document).on("click", ".checkall", function(e) {
    	var target = $(this).attr("id") == "checkall_1" ? "#synonym-list" : "#related-word-list";
    	var targetCheckbox = $(this).attr("id") == "checkall_1" ? "thesaurus-synonym" : "thesaurus-related-word";
    	
    	var flag = $(target).children().find("input")[0].checked;
    	flag = !flag;
    	
    	$('input:checkbox[name="'+targetCheckbox+'"]').each(function() {
    		this.checked = flag;
    	});
    });
}
