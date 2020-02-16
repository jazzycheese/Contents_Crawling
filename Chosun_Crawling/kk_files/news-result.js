var NewsResult = function(search, step) {
    this.search = search;
    this.initResultParams();

    this.currentPage = this.resultParams.startNo || 1;
    this.perPage = this.resultParams.resultNumber || 10;

    this.dateFormat = "YYYY/MM/DD";
    this.ignoreNewsIds = [];

    this.$newsLoader = $(".news-loader");
    this.$ignoreNewsCnt = $(".ignore-news-cnt");
    this.$totalNewsCnt = $("#total-news-cnt");


    this.paginationTemplate = Handlebars.getTemplate("util/pagination_news_result");
    if (parseInt(step) > 1) {
        this.getNews();
    }

    this.$csKeywordsWrap = $("#cs-keywords-wrap");
    this.csKeywordsTemplate = Handlebars.getTemplate("news/cs-keywords");
    this.checkCSKeywords();

    this.$resultWrap = $("#news-results");
    this.resultTemplate = Handlebars.getTemplate("news/results");

    this.$quotationResultWrap = $("#quotations-results");
    this.quotationResultTemplate = Handlebars.getTemplate("news/quotation-results");

    this.dateFilterWrap = $("#date-filter-wrap");
    this.dateFilterTemplate = Handlebars.getTemplate("news/date-filter");

    this.$saveExpressionBtn = $(".save-expression-btn");

    this.initEvent();

    this.search.checkStep();
};

NewsResult.prototype.initResultParams = function() {
    var self = this;

    self.resultParams = self.search.detailSearch.getFormData();
    self.resultParams.startNo = self.currentPage || 1;
    self.resultParams.resultNumber = self.perPage || 10;

    self.csKeywords = [];
    if (self.resultParams.searchKey && self.resultParams.searchKey.split(",").length > 1) {
        _.forEach(self.resultParams.searchKey.split(","), function(csKey) {
            self.csKeywords.push({
                key: unescape(csKey).replace(/&apos;/g, "'"),
                checked: true
            });
        });
    }

    this.resultParams.providerCodes = this.resultParams.providerCodes || [];
    this.resultParams.categoryCodes = this.resultParams.categoryCodes || [];
    this.resultParams.incidentCodes = this.resultParams.incidentCodes || [];
    this.resultParams.dateCodes = this.resultParams.dateCodes || [];
    this.networkNodeType = this.resultParams.networkNodeType || "";
}

//검색창에서 엔터키 혹은 검색 버튼을 클릭했을때 기타 검색조건 초기화(기간, 분석제외기사 선택항목)
NewsResult.prototype.initSearchCondition = function() {
	var self = this;
    //self.clearResultFilter();
	$(".filter-input").prop("checked", false);
	
	//언론사, 통합분류, 사건/사고까지 초기화하려면 아래 코드 사용
    //self.search.detailSearch.clearProviderCodes();
    //self.search.detailSearch.clearCategoryCodes();
    //self.search.detailSearch.clearIncidentCodes();

    self.resultParams.providerCodes = [];
    self.resultParams.categoryCodes = [];
    self.resultParams.incidentCodes = [];
    self.resultParams.dateCodes = [];
    self.clearIgnoreNewsIds();
}

NewsResult.prototype.getResultParams = function() {
    var resultParams = this.resultParams;
    //Search 객체로 부터 정의된 searchParam을 기반으로 사용자 추가 설정 parameter 제공
    if (this.ignoreNewsIds.length) {
        resultParams.exceptNewsIds = this.ignoreNewsIds;
    }
    return resultParams;
}

NewsResult.prototype.checkCSKeywords = function() {
    if (this.csKeywords) {
        var csKeywordsHtml = this.csKeywordsTemplate({ csKeywords: this.csKeywords });
        this.$csKeywordsWrap.html(csKeywordsHtml);
    } else {
        this.$csKeywordsWrap.html("");
    }
}

NewsResult.prototype.getNews = function(isCollapse, clearNewsIds, isCSsearch) {
    var self = this;

    self.initResultParams();

    if (self.resultParams.indexName == "news_quotation" && self.resultParams.mainTodayPersonYn == "Y") {
        self.resultParams.quotationKeyword1 = null;
        self.resultParams.quotationKeyword3 = self.resultParams.searchKey;
    }

    if (self.resultParams.indexName == "news_quotation" && !authManager.hasAuth()) {
        var start_date = moment(self.resultParams.endDate).subtract(1, 'month').format("YYYY-MM-DD");
        if (self.resultParams.startDate < start_date && self.currentPage == 1) {
            alert("인용문 검색에서 비회원은 최대 1개월까지 검색이 가능합니다.");
            self.resultParams.startDate = start_date;
        }
    }

    if (self.resultParams.indexName == "news") {
        $("#total-search-key-copy").val("");
        $("#quotation-keyword2").val("");
        $("#quotation-keyword3").val("");
    }

    if (clearNewsIds) {
        self.resultParams.newsIds = [];
        self.search.detailSearch.newsIds = null;
    }

    if (isCSsearch) {
        var checkedKeywords = $(".cs-keyword-checkbox:checked").map(function(){
            return $(this).val();
        }).get();

        $("#total-search-key").val(checkedKeywords.join(", "));
        // self.resultParams.searchKey = checkedKeywords.join(", ");
    }

    if (!self.resultParams.searchKey) {
        if (self.resultParams.searchKeys) {
            var detailSearchKeys = self.resultParams.searchKeys[0];

            if (!detailSearchKeys.orKeywords
                && !detailSearchKeys.andKeywords
                && !detailSearchKeys.exactKeywords
                && detailSearchKeys.notKeywords) {

                alert("제외 키워드는 단독으로 이용할 수 없습니다. \n기본 검색어 또는 다른 상세 키워드를 입력 후 검색하시기 바랍니다.");
                return false;
            }
        }
    }

    self.resultParams.isTmUsable = $("#filter-tm-use").is(":checked");
    self.resultParams.isNotTmUsable = $("#filter-not-tm-use").is(":checked");

    self.resultParams.dateCodes = [];

    if ($(".filter-input[data-type='date']:checked").length) {
        _.forEach($(".filter-input[data-type='date']:checked"), function(dateCode) {
            self.resultParams.dateCodes.push($(dateCode).val());
        });
    }

    if ($("#rescan-keyword").val()) {
        self.resultParams.rescanKeyword = $("#rescan-keyword").val();
    }

    if ($("#rescan-except-keyword").val()) {
        self.resultParams.rescanExceptKeyword = $("#rescan-except-keyword").val();
    }

    if (self.resultParams) {
        self.$newsLoader.removeClass("hidden");
        if (isCollapse) {
            $("#collapse-step-2").collapse('show');
        }

        if (self.resultParams.indexName == "news_quotation") {
            $(".news-analysis__target-tabs li").removeClass('active');
            $(".news-analysis__target-tabs li:last").addClass('active');
            $(".news-result-tab-content .tab-pane").removeClass("active");
            $("#quotation-results-tab").addClass("active");

        } else {
            $(".news-analysis__target-tabs li").removeClass('active');
            $(".news-analysis__target-tabs li:first").addClass('active');
            $(".news-result-tab-content .tab-pane").removeClass("active");
            $("#news-results-tab").addClass("active");
        }
        self.triggerSearchIndex(self.resultParams.indexName);

        $(".total-search-key-wrap").hide();
        $(".total-search-key").text('');
        var fullKeyword = self.search.detailSearch.getFullKeyword();
        if (fullKeyword) {
            self.resultParams.searchKey = fullKeyword;
            
            //화면에 표기하기전에 unescapse 처리
            fullKeyword = _.unescape(fullKeyword);
            fullKeyword = _.replace(fullKeyword, /&apos;/g, "'");
            
            $(".total-search-key-wrap").show();
            $(".total-search-key").text(fullKeyword);
        }

        $(".quotation-search-key").hide();
        $(".quotation-search-key").text('');
        var quotationKeyword = "";
        if (self.resultParams.quotationKeyword2) {
            var quotationKeyword2 = ['(인용문: ', self.resultParams.quotationKeyword2, ') '];
            quotationKeyword += quotationKeyword2.join('');
        }
        if (self.resultParams.quotationKeyword3) {
            var quotationKeyword3 = ['(정보원: ', self.resultParams.quotationKeyword3, ') '];
            quotationKeyword += quotationKeyword3.join('');
        }
        if (quotationKeyword) {
            $(".quotation-search-key").show();
            $(".quotation-search-key").text(quotationKeyword);
        }
        
        
        $.ajax({
            url: _contextPath + "/api/news/search.do",
            contentType: "application/json;charset=utf-8",
            dataType: "json",
            method: "POST",
            data: JSON.stringify(self.resultParams),
            success: function(d) {
                if (d) {
                    self.totalCount = d.totalCount || 0;
                    self.$totalNewsCnt.text(formatNumber(self.totalCount));

                    $(".date-cnt").text("(0)");
                    if (d.resultList) {
                        self.resultList = d.resultList;
                        var rgx = new RegExp("^http");

                        _.forEach(self.resultList, function(newsItem) {
                            newsItem.FORMATTED_DATE = moment(newsItem.DATE).format(self.dateFormat);
                            newsItem.ignored = false;
                            
                            //원본주소 문자열에 프로토콜이 존재하는지 확인 후 없으면 http:// 추가
                            if(newsItem.PROVIDER_LINK_PAGE != "" && rgx.test(newsItem.PROVIDER_LINK_PAGE) == false){
                            	newsItem.PROVIDER_LINK_PAGE = "http://"+newsItem.PROVIDER_LINK_PAGE;
                            }
                            
                            if (self.ignoreNewsIds && self.ignoreNewsIds.length) {
                                if (self.ignoreNewsIds.indexOf(newsItem.NEWS_ID) >= 0) {
                                    newsItem.ignored = true;
                                }
                            }
                        });

                        self.renderNews();
                    }

                    $(".provider-cnt").text("(0)");
                    $(".filter-provider").prop("checked", false);
                    if (d.getProviderCodeList) {
                        _.forEach(d.getProviderCodeList, function(providerCode) {
                            var providerCnt = "(" + formatNumber(providerCode.ProviderCount) + ")";
                            $(".provider-cnt[data-code='" + providerCode.ProviderCode + "']").text(providerCnt);
                        });

                        if (self.resultParams.providerCodes && self.resultParams.providerCodes.length) {
                            _.forEach(self.resultParams.providerCodes, function(code) {
                                $(".filter-provider[value='" + code + "']").prop("checked", true);
                            });
                        }
                    }

                    $(".category-cnt").text("(0)");
                    $(".filter-category").prop("checked", false);
                    if (d.getCategoryCodeList) {
                        _.forEach(d.getCategoryCodeList, function(categoryCode) {
                            var categoryCnt = "(" + formatNumber(categoryCode.CategoryCount) + ")";
                            $(".category-cnt[data-code='" + categoryCode.CategoryCode + "']").text(categoryCnt);
                        });

                        if (self.resultParams.categoryCodes && self.resultParams.categoryCodes.length) {
                            _.forEach(self.resultParams.categoryCodes, function(code) {
                                $(".filter-category[value='" + code + "']").prop("checked", true);
                            });
                        }
                    }

                    $(".incident-cnt").text("(0)");
                    if (d.getIncidentCodeList) {
                        _.forEach(d.getIncidentCodeList, function(incidentCode) {
                            var incidentCnt = "(" + formatNumber(incidentCode.IncidentCount) + ")";
                            $(".incident-cnt[data-sn='" + incidentCode.IncidentCode + "']").text(incidentCnt);
                        });

                        if (self.resultParams.incidentCodes && self.resultParams.incidentCodes.length) {
                            _.forEach(self.resultParams.incidentCodes, function(code) {
                                $(".filter-incident[data-sn='" + code + "']").prop("checked", true);
                            });
                        }
                    }

                    if (d.getDateCodeList) {
                        _.forEach(self.resultParams.dateCodes, function(dateCode) {
                            var dateCodeItem = _.find(d.getDateCodeList, function(c) { return c.date == dateCode; });
                            if (dateCodeItem) {
                                dateCodeItem.isChecked = true;
                            }
                        });
                        
                        _.forEach(d.getDateCodeList, function(dateCode){
                        	dateCode.dateCount = formatNumber(dateCode.dateCount);
                        });
                        
                        var dateFilterHtml = self.dateFilterTemplate({dates: d.getDateCodeList});
                        self.dateFilterWrap.html(dateFilterHtml);
                    }
                    $(".tm-use-cnt").text("(0)");
                    if (d.totalCntAnalysis) {
                        $(".tm-use-cnt").text("(" + formatNumber(d.totalCntAnalysis) + ")");
                    }
                    $(".not-tm-use-cnt").text("(0)");
                    if (d.totalCntNotAnalysis) {
                        $(".not-tm-use-cnt").text("(" + formatNumber(d.totalCntNotAnalysis) + ")");
                    }
                }
                
                /*
                //뉴스검색결과 0건일때 필터 체크 해제하는 코드. 
                //체크해제로 다시 돌아갈수 없어서 주석처리. 예외상황 해결 후 ㅈ
                if(d.totalCount == 0){
                	$(".filter-date").prop("checked", false);
                	$(".filter-incident").prop("checked", false);
                	$(".filter-tm-use").prop("checked", false);
                	$(".filter-not-tm-use").prop("checked", false);
                }
                */
                
                if (!isCSsearch) {
                    self.checkCSKeywords();
                }

                self.$newsLoader.addClass("hidden");

                $(".checkbox-cancel").tooltip();

                if (self.resultParams.newsIds && self.resultParams.newsIds.length) {
                    $(".filter-input").prop("disabled", true);
                    $(".rescan-input").prop("disabled", true);
                    $(".filter-tooltip").tooltip();
                    $(".save-expression-modal-btn").hide();

                    var now = moment();
                    var analysisStartDay = moment();
                    var analysisEndDay = moment();
                    
                    if(self.resultParams.endDate != undefined && self.resultParams.endDate != null){
                    	analysisStartDay = moment(self.resultParams.endDate);
                    	analysisEndDay = moment(self.resultParams.endDate);
                    }
                    
                    var analysisStartTime = "08:00";
                    var analysisEndTime = "17:00";
                    var hour = parseInt(now.format("HH"));

                    if (hour < 8) {
                        analysisStartDay = analysisStartDay.subtract(1, 'days');
                        analysisEndDay = analysisEndDay.subtract(1, 'days');
                    } else if(hour >= 8 && hour < 17) {
                        analysisStartDay = analysisStartDay.subtract(1, 'days');
                        analysisEndTime = "08:00";
                    }

                    $(".start-date-key").text(analysisStartDay.format("YYYY-MM-DD") + " " + analysisStartTime);
                    $(".end-date-key").text(analysisEndDay.format("YYYY-MM-DD") + " " + analysisEndTime);
                } else {
                    $(".filter-input").prop("disabled", false);
                    $(".rescan-input").prop("disabled", false);
                    $(".filter-tooltip").tooltip('destroy');
                    $(".save-expression-modal-btn").show();

                    $(".start-date-key").text(self.resultParams.startDate);
                    $(".end-date-key").text(self.resultParams.endDate);
                }

                if (!authManager.hasAuth()) {
                    $(".ignore-checkbox").prop("disabled", true);
                    $(".checkbox-cancel").attr('data-original-title', '비회원은 분석 제외 기능을 사용하실 수 없습니다.');
                }
            }, error: function(e) {
                console.log(e);
                self.$newsLoader.addClass("hidden");
            }
        });

        $('html').scrollTop(0);
    }
}

NewsResult.prototype.renderNews = function() {
    var self = this;

    var indexName = self.resultParams.indexName;
    var pageCount = Math.ceil(self.totalCount / self.perPage);
    var pageHtml = self.paginationTemplate({
        pagination: {
            page: self.currentPage,
            pageCount: pageCount
        }
    });

    $(".search-info-sub-desc").hide();

    $(".search-info-sub-desc[data-index='" + indexName + "']").show();
    $(".search-info-quotation-at").hide();
    $(".search-info-quotation-of").show();

    $(".search-info-detail-desc").hide();
    if(self.resultParams.quotationKeyword2 != null && self.resultParams.quotationKeyword2 != '') {
        $(".search-info-detail-desc[data-index='quotation']").show();
        $(".quotation-keyword2").html(self.resultParams.quotationKeyword2);

        if (!self.resultParams.searchKey) {
            $(".search-info-quotation-desc").hide();
        } else {
            $(".search-info-quotation-of").hide();
            $(".search-info-quotation-at").show();
        }
        if (self.resultParams.quotationKeyword3 != null && self.resultParams.quotationKeyword3 != '') {
            $(".quotation-keyword2-sub").show();
            $(".quotation-keyword2-sub").text('인용문과');
        }
    }
    if(self.resultParams.quotationKeyword3 != null && self.resultParams.quotationKeyword3 != '') {
        $(".search-info-detail-desc[data-index='speaker']").show();
        $(".quotation-keyword3").html(self.resultParams.quotationKeyword3);
        if (!self.resultParams.searchKey) {
            $(".search-info-quotation-desc").hide();
        } else {
            $(".search-info-quotation-of").hide();
            $(".search-info-quotation-at").show();
        }
    }

    if (indexName == "news") {
        var newsHtml = self.resultTemplate({ newsList: self.resultList });
        self.$resultWrap.html(newsHtml);
        $("#news-results-pagination").html(pageHtml);
    } else if (indexName == "news_quotation") {
        var quotationsHtml = self.quotationResultTemplate({ quotationList: self.resultList });
        self.$quotationResultWrap.html(quotationsHtml);
        $("#quotations-results-pagination").html(pageHtml);
    }

    $(".result-tooptip").tooltip();
}

NewsResult.prototype.getNetworkParams = function() {
    var self = this;
    var params = self.resultParams;
    var newsClusterIds = self.resultParams.newsIds;
    if (newsClusterIds && newsClusterIds.length) {
        if (newsClusterIds.length > 100) {
            newsClusterIds = _.chunk(newsClusterIds, 100)[0];
        }
        newsClusterIds = newsClusterIds.join(",");
    }

    return {
        pageInfo: "newsResult",
        login_chk: null,
        LOGIN_SN: null,
        LOGIN_NAME: null,
        indexName: params.indexName,
        keyword: params.searchKey,
        byLine: params.byLine,
        searchScope: 1,
        searchFtr: 1,
        startDate: params.startDate,
        endDate: params.endDate,
        sortMethod: params.searchSortType,
        contentLength: 100,
        providerCode: params.providerCodes.join(","),
        categoryCode: params.categoryCodes.join(","),
        incidentCode: params.incidentCodes.join(","),
        dateCode: $(".filter-date:checked").map(function() {return this.value;}).get().join(','),
        highlighting: true,
        sessionUSID: null,
        sessionUUID: "test",
        listMode: null,
        categoryTab: null,
        newsId: null,
        newsCluster: newsClusterIds,
        delnewsId: self.ignoreNewsIds.join(","),
        delquotationId: null,
        delquotationtxt: null,
        filterProviderCode: null,
        filterCategoryCode: null,
        filterIncidentCode: null,
        filterDateCode: null,
        filterAnalysisCode: null,
        startNo: 1,
        resultNumber: 10,
        topmenuoff: null,
        resultState: "detailSearch",
        keywordJson: null,
        keywordFilterJson: null,
        realKeyword: null,
        keywordYn: "Y",
        totalCount: 5,
        interval: 1,
        quotationKeyword1: null,
        quotationKeyword2: null,
        quotationKeyword3: null,
        printingPage: null,
        searchFromUseYN: "N",
        searchFormName: null,
        searchFormSaveSn: null,
        mainTodayPersonYn: null,
        period: "3month",
        sectionDiv: 1000,
        maxNewsCount: 100,
        networkNodeType: self.networkNodeType
    };
}

NewsResult.prototype.clearResultFilter = function() {
    var self = this;

    $(".filter-input").prop("checked", false);

    self.search.detailSearch.clearProviderCodes();
    self.search.detailSearch.clearCategoryCodes();
    self.search.detailSearch.clearIncidentCodes();

    self.resultParams.providerCodes = [];
    self.resultParams.categoryCodes = [];
    self.resultParams.incidentCodes = [];
    self.resultParams.dateCodes = [];

    $("#byline").val("");
    
    self.getNews();
}

NewsResult.prototype.clearIgnoreNewsIds = function() {
    var self = this;

    self.ignoreNewsIds = [];
    $(".news-item, .quotation-item").removeClass("ignore");
    $(".ignore-checkbox").prop("checked", false);
    self.$ignoreNewsCnt.text("0");
    self.$totalNewsCnt.text(self.totalCount);
    self.resultParams.exceptNewsIds = [];
}

NewsResult.prototype.triggerSearchIndex = function(indexName) {
    $("input[name='search-index-type'][value='" + indexName + "']").trigger("click");
    $("input[name='index-name']").val(indexName);
}

NewsResult.prototype.checkSearchKeyword = function(e) {
    var self = this;
    if (!self.resultParams.searchKey) {
        e.preventDefault();
        $("#analytics-preview-tab").trigger("click");
        alert("분석 및 시각화를 위해서는 검색어가 필요합니다.");
    }
}

NewsResult.prototype.initEvent = function() {
    var self = this;

    $(document).on("click", ".page-link", function(e) {
        e.preventDefault();

        var page = $(this).data('page');
        if (page == self.currentPage) {
            return false;
        }
        self.currentPage = page;
        self.resultParams.startNo = self.currentPage;

        self.getNews();
    });

    $("#rescan-btn").click(function(e) {
       e.preventDefault();
       
       self.search.detailSearch.rescanKeyword = $("#rescan-keyword").val();
       self.search.detailSearch.rescanExceptKeyword = $("#rescan-except-keyword").val();

       if (!self.resultParams.searchKey
           && !self.search.detailSearch.rescanKeyword
           && self.search.detailSearch.rescanKeyword == ""
           && self.search.detailSearch.rescanExceptKeyword) {

           alert("기본검색어가 없는 경우 결과 내 재검색에서 '키워드 제외' 기능은 사용이 불가능합니다.");
           return false;
       } else {
           var fullkeyword = self.search.detailSearch.getFullKeyword();
           if (self.resultParams.indexName == "news") {
               self.resultParams.searchKey = fullkeyword;
           } else if (self.resultParams.indexName == "news_quotation") {
               $("#quotation-keyword1").val(fullkeyword);
           }

           self.currentPage = self.resultParams.startNo = 1;

           self.getNews();
       }
    });

    $(document).on("change", ".filter-input", function(e) {
        var $filter = $(this);
        var type = $filter.data('type');
        var code = $filter.val();

        if (type == "provider") {
            self.search.detailSearch.setProviderCodes(code, $filter.is(":checked"));
            self.resultParams.providerCodes = self.search.detailSearch.providerCodes;
        } else if (type == "category") {
            self.search.detailSearch.setCategoryCodes(code, $filter.is(":checked"));
            self.resultParams.categoryCodes = self.search.detailSearch.categoryCodes;
        } else if (type == "incident") {
            var code = $filter.data("sn");
            self.search.detailSearch.setIncidentCodes(code, $filter.is(":checked"));
            self.resultParams.incidentCodes = self.search.detailSearch.incidentCodes;
        }

        self.currentPage = self.resultParams.startNo = 1;

        self.getNews();
    });

    $(document).on("change", ".ignore-checkbox", function(e) {
        var newsId = $(this).val();
        var $newsItem;
        if (self.resultParams.indexName == "news") {
            $newsItem = $(".news-item[data-id='" + newsId + "']");
        } else if (self.resultParams.indexName == "news_quotation") {
            $newsItem = $(".quotation-item[data-id='" + newsId + "']");
        }

        if ($(this).is(":checked")) {
            self.ignoreNewsIds.push(newsId);
            $newsItem.addClass("ignore");
        } else {
            self.ignoreNewsIds.splice(self.ignoreNewsIds.indexOf(newsId), 1);
            $newsItem.removeClass("ignore");
        }

        // self.resultParams.exceptNewsIds = self.ignoreNewsIds;
        var ignoreNewsCnt = formatNumber(self.ignoreNewsIds.length);
        var totalNewsCnt = self.totalCount - ignoreNewsCnt;
        self.$ignoreNewsCnt.text(ignoreNewsCnt);
        self.$totalNewsCnt.text(totalNewsCnt);
    });

    $(".refresh-result-filter-btn").click(function(e) {
        self.clearResultFilter();
    });

    $(".provider-unfold-btn").click(function(e) {
        $(this).blur();
        $(".collapsed-provider").removeClass("hidden");
    });

    $(".provider-fold-btn").click(function(e) {
        $(".collapsed-provider").addClass("hidden");
    });

    $(".clear-ignore-btn").click(function(e) {
        if (confirm("분석 제외 대상으로 지정한 뉴스를 해제하시겠습니까?")) {
            self.clearIgnoreNewsIds();
        }
    });

    $(".result-filter.sort").change(function(e) {
        self.currentPage = self.resultParams.startNo = 1;
        self.resultParams.sortMethod = $(this).val();
        self.getNews();
    });

    $(".result-filter.per-page").change(function(e) {
        self.currentPage = self.resultParams.startNo = 1;
        self.resultParams.resultNumber = self.perPage = $(this).val();
        self.getNews();
    });

    $(".analysis-target-tab").on("shown.bs.tab", function(e) {
        var $tab = $(e.target);
        var indexName = $tab.data("index");

        self.clearIgnoreNewsIds();
        self.resultParams.startNo = self.currentPage = 1;
        self.triggerSearchIndex(indexName);

        if (indexName == "news") {
            if (!self.resultParams.searchKey) {
                var quotationKeyword2 = self.resultParams.quotationKeyword2;
                var quotationKeyword3 = self.resultParams.quotationKeyword3;
                if (quotationKeyword2) {
                    $("#total-search-key").val(quotationKeyword2);
                } else if (!quotationKeyword2 && quotationKeyword3) {
                    $("#total-search-key").val(quotationKeyword3);
                }
            }
        } else if (indexName == "news_quotation") {
            $("#quotation-keyword1").val(self.resultParams.searchKey);
        }

        self.getNews();

        var target = $tab.data("target");
        $(".news-result-tab-content .tab-pane").removeClass("active");
        $(target).addClass("active");
    });

    $(".news-search-btn").click(function(e) {
        e.preventDefault();
        
        //새로 검색하는 경우, 기타 검색조건 초기화
        self.initSearchCondition();
        self.currentPage = 1;
        self.getNews(true, true);
    });

    $("#total-search-key").keyup(function(e) {
        if (e.which == 13) {
            e.preventDefault();
            
            //새로 검색하는 경우, 기타 검색조건 초기화
            self.initSearchCondition();
            self.currentPage = 1;
            self.getNews(true, true);
        }
    });

    $(".save-expression-modal-btn").click(function(e) {
        if (authManager.checkAuth()) {
            $("#save-expression-modal").modal();

            var expressionParams = _.cloneDeep(self.resultParams);
            if (self.ignoreNewsIds.length) {
                expressionParams.exceptNewsIds = self.ignoreNewsIds;
            }

            $("#srchindex").val(expressionParams.indexName);
            $("#srchwrd").val(expressionParams.searchKey);
            $("#searchType").val(expressionParams.searchScopeType);
            $("#searchFilter").val(expressionParams.searchFilterType);
            $("#searchStartDate").val(expressionParams.startDate);
            $("#searchEndDate").val(expressionParams.endDate);
            $("#quotationKeyword1").val(expressionParams.quotationKeyword1);
            $("#quotationKeyword2").val(expressionParams.quotationKeyword2);
            $("#quotationKeyword3").val(expressionParams.quotationKeyword3);

            var indexName = expressionParams.indexName=='news'?'뉴스':'인용문';

            var conditionTexts = [];
            conditionTexts.push("검색어: " + expressionParams.searchKey);
            conditionTexts.push("기간: " + expressionParams.startDate + " ~ " + expressionParams.endDate);
            conditionTexts.push("검색대상: " + indexName);
            conditionTexts.push("검색어 범위: " + $("#search-scope-type option:selected").text());
            conditionTexts.push("검색어 처리: " + $("#search-filter-type option:selected").text());

            if (expressionParams.providerCodes) {
                $("#searchProviderCode").val(expressionParams.providerCodes.join(","));
                var providerNames = [];

                _.forEach(expressionParams.providerCodes, function(code) {
                    providerNames.push($(".provider-btn[data-code='" + code + "']").text().trim());
                });

                $("#searchProviderNm").val(providerNames.join(","));
                if (providerNames) {
                    conditionTexts.push("언론사: " + providerNames.join(","));
                }
            }

            if (expressionParams.categoryCodes) {
                $("#searchCategoryPath").val(expressionParams.categoryCodes.join(","));

                var categoryNames = [];
                _.forEach(expressionParams.categoryCodes, function(code) {
                    var finded = false;
                    var categoryName = "";
                    _.forEach(self.search.detailSearch.categories, function(category1) {
                        if (category1.id == code) {
                            categoryName = category1.text;
                            return false;
                        }

                        if (category1.children) {
                            _.forEach(category1.children, function(category2) {
                                if (category2.id == code) {
                                    categoryName = category2.text;
                                    finded = true;
                                    return false;
                                }
                            });
                        }

                        if (finded) { return false; }
                    });
                    categoryNames.push(categoryName);
                });

                $("#searchCategoryNm").val(categoryNames.join(","));

                if (categoryNames) {
                    conditionTexts.push("통합분류: " + categoryNames.join(","));
                }
            }

            if (expressionParams.incidentCodes) {
                $("#searchIncidentCategoryPath").val(expressionParams.incidentCodes.join(","));

                var incidentNames = [];
                _.forEach(expressionParams.incidentCodes, function(code) {
                    var finded = false;
                    var incidentName = "";
                    _.forEach(self.search.detailSearch.incidents, function(incident1) {
                        if (incident1.id == code) {
                            incidentName = incident1.text;
                            return false;
                        }

                        if (incident1.children) {
                            _.forEach(incident1.children, function(incident2) {
                                if (incident2.id == code) {
                                    incidentName = incident2.text;
                                    finded = true;
                                    return false;
                                }

                                _.forEach(incident2.children, function(incident3) {
                                    if (incident3.id == code) {
                                        incidentName = incident3.text;
                                        finded = true;
                                        return false;
                                    }
                                });

                                if (finded) { return false; }
                            });
                        }

                        if (finded) { return false; }
                    });

                    incidentNames.push(incidentName);
                });

                $("#searchIncidentCategoryNm").val(incidentNames.join(","));

                if (categoryNames) {
                    conditionTexts.push("사건/사고: " + incidentNames.join(","));
                }
            }

            $("#expression-condition").html(conditionTexts.join("<br>"));

            var filterTexts = [];

            var dateCodes = [];
            if ($(".filter-input[data-type='date']:checked").length) {
                _.forEach($(".filter-input[data-type='date']:checked"), function(dateCode) {
                    dateCodes.push($(dateCode).val());
                });
            }

            if (dateCodes && dateCodes.length) {
                $("#filterSearchYear").val(dateCodes.join(","));
                filterTexts.push("기간: " + dateCodes.join(","));
            }
            $("#expression-filter-condition").html(filterTexts.join("<br>"));

            if (expressionParams.exceptNewsIds && expressionParams.exceptNewsIds.length) {
                $("#exclusionNewsId").val(expressionParams.exceptNewsIds.join(","));
                $("#expression-ignore-news-ids").html(expressionParams.exceptNewsIds.join("<br>"))
            } else {
                $("#expression-ignore-news-ids").html("");
            }
        }
    });

    $(".save-expression-btn").click(function(e) {
        var expressionData = getFormData($("#expression-form"));

        if (expressionData.srchrormulaNm) {
            $.ajax({
                url: "/api/private/expressions/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(expressionData),
                success: function(d) {
                    alert("정상 처리 되었습니다.");
                    $("#save-expression-modal").modal('hide');
                }, error: function(xhr, status, error) {
                    alert("검색식 저장 중 문제가 발생하였습니다. 문제가 지속되면 운영팀에 문의하시기 바랍니다.");
                }
            });
        } else {
            alert("검색식명을 입력하세요.");
        }
    });

    $(document).on("change", ".cs-keyword-checkbox", function(e) {
        var checkedKeywords = $(".cs-keyword-checkbox:checked").map(function(){
            return $(this).val();
        }).get();

        _.forEach(self.csKeywords, function(csKeyItem) {
            if (checkedKeywords.indexOf(csKeyItem.key) > -1) {
                csKeyItem.checked = true;
            } else {
                csKeyItem.checked = false;
            }
        });

        self.getNews(false, false, true);
    });

    $('#collapse-step-1').on('shown.bs.collapse', function () {
        $(".rescan-input").val("");
    });

    $('#collapse-step-3').on('shown.bs.collapse', function () {
        $("#analytics-preview-tab").show();
        if (!self.previewData) {
            self.previewData = new PreviewData(self);
        } else {
            self.previewData.renderPreview();
        }

        $("#analytics-preview-tab").trigger("click");
    });

    $("#analytics-preview-tab").on('shown.bs.tab', function(e) {
        if (self.previewData) {
            self.previewData.renderPreview();
        } else {
            self.previewData = new PreviewData(self);
        }
    });

    $('#analytics-trend-tab').on('shown.bs.tab', function (e) {
        self.checkSearchKeyword(e);

        if (!self.trendChart) {
            self.trendChart = new TrendChart(self);
        } else {
            self.trendChart.getTrendData();
        }
    });

    $('#analytics-network-tab').on('shown.bs.tab', function (e) {
        if (self.search.currentStep || authManager.checkAuth()) {
            self.checkSearchKeyword(e);

            if (!self.analysisRelationships) {
                self.analysisRelationships = new AnalysisRelationships(self, relChart);
            } else {
                self.analysisRelationships.updateResultData(self);
            }
        } else {
            e.preventDefault();
            $("#analytics-preview-tab").trigger("click");
        }
    });

    $('#analytics-relational-word-tab').on('shown.bs.tab', function (e) {
        self.checkSearchKeyword(e);

        if (!self.relationWord) {
            self.relationWord = new RelationalWord(self);
        }
        self.relationWord.render();
    });

    $('#analytics-info-extract-tab').on('show.bs.tab', function (e) {
    	if (authManager.checkAuth()) {
    		self.checkSearchKeyword(e);
    		
    		if (!self.infoExtractor) {
    			self.infoExtractor = new InfoExtractor();
    		}
    		
    		self.infoExtractor.setSearchParams(self.getResultParams());
    		
    	} else {
    		e.preventDefault();
    	}
    });

    $('#analytics-info-extract-tab').on('shown.bs.tab', function (e) {
    	if(self.resultParams.indexName == "news_quotation"){
    		//인용문 검색 상태인지 확인
    		alert("해당 기능은 '인용문' 검색 사용 시 동작하지 않습니다.");
    		$('#analytics-info-extract-tab').blur();
    		$("#analytics-preview-tab").click();
    		return;
    	}else if(self.resultParams.isNotTmUsable && !self.resultParams.isTmUsable){
    		alert("해당 기능은 '분석 제외' 필터 사용 시 동작하지 않습니다.");
    		$('#analytics-info-extract-tab').blur();
    		$("#analytics-preview-tab").click();
    		return;
    	}
    });
    
    // 히스토리 tab event
    $('#analytics-history-tab').on('shown.bs.tab', function (e) {
        if (!self.historyData) {
            self.historyData = new HistoryData(self);
        } else {
            self.historyData.renderHistory();
        }
    });

    $("#expression-name").keypress(function(e) {
        if (e.keyCode == 13) {
            e.preventDefault();
        }
    });

    $("#collapse-step-1").on("shown.bs.collapse", function() {
        /*
    	if ((self.resultParams.indexName == "news" && (Object.keys(self.resultParams.searchKeys[0]).length != 0 || self.resultParams.byLine != "")) ||
            (self.resultParams.indexName == "news_quotation" && (self.resultParams.quotationKeyword2 != "" || self.resultParams.quotationKeyword3 != ""))) {
            $("#detail-filter-btn").click();
        }
    	*/
        //검색 후 상세검색 필터가 항상 열려있도록 수정
        $("#detail-filter-div").toggleClass("open", true);
    });
}