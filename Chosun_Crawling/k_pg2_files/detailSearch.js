var DetailSearch = function () {
    this.seq = 0;

    this.$indexType = $("input[name='index-name']");

    this.searchKeys = {};
    this.$formWrap = $("#news-detail-form-wrap");
    this.rowTemplate = Handlebars.getTemplate("search/detailRow");

    this.providers = [];
    this.providersTemplate = Handlebars.getTemplate("search/providers");
    this.$providerWrap = $("#providers-wrap");

    this.newsIds = [];

    this.categories = [];
    this.categoriesTemplate = Handlebars.getTemplate("search/categories");
    this.categoriesrWrap = $("#categories-wrap");
    this.subCategoriesTemplate = Handlebars.getTemplate("search/sub-categories");

    this.incidents= [];
    this.incidentsTemplate = Handlebars.getTemplate("search/incidents");
    this.incidentsWrap = $("#incidents-wrap");
    this.subIncidentsTemplate = Handlebars.getTemplate("search/sub-incidents");

    this.categoryCodes = []; //사용자 입력에 의한 분류 목록
    this.incidentCodes = []; //사용자 입력에 의한 사건/사고 목록

    this.selectedClass = "selected";

    this.addRow();
    this.getNewsProviders();
    this.getNewsCategories();
    this.getNewsInidents();
    this.initEvent();
    this.initDatepicker();
    this.initSearchIndexType();
}

DetailSearch.prototype.initSearchIndexType = function() {
    var self = this;
    $("input[name='search-index-type'][value='news']").prop('checked', true);
    $("input.detail-keyword").val("");
    self.setSearhGroup("news");
}

DetailSearch.prototype.initDatepicker = function() {
    var self = this;

    var defaultOption = {
        viewMode: 'days',
        format: 'YYYY-MM-DD',
        defaultDate: moment().subtract(3, "month")
    };

    $("#search-begin-date").datetimepicker(defaultOption);
    defaultOption.defaultDate = moment();
    $("#search-end-date").datetimepicker(defaultOption);
}

DetailSearch.prototype.getNewsProviders = function() {
    var self = this;

    $.getJSON(_contextPath + "/api/providers.do", function(providers) {
        _.forEach(providers, function(provider) {
            provider.P_CODE = _.padStart(provider.CODE, 8, "0");
        });
        self.providers = providers;
        $("#total-provider-cnt").text(self.providers.length);

        var total_provider_cnt = 0;
        _.forEach(_.groupBy(providers, 'GUBUN_CODE'), function(groupItems, groupKey) {
            if (groupKey <= 50) {
                total_provider_cnt += groupItems.length;
            }
        });

        var providersHtml = self.providersTemplate({
            areaProviders: _.groupBy(self.providers, 'AREA_CODE'),
            groupedProviders: _.groupBy(providers, 'GUBUN_CODE'),
            total_provider_cnt: total_provider_cnt
        });
        self.$providerWrap.html(providersHtml);

        if (self.preSelectedProviderCodes) {
            _.forEach(self.preSelectedProviderCodes, function(code) {
                $(".provider-btn[data-code='" + code + "']").addClass("selected");
            });

            $(".selected-provider-cnt").text(self.preSelectedProviderCodes.length);
        } else {
            $(".selected-provider-cnt").text(self.providers.length);
        }
    });
}

DetailSearch.prototype.getNewsCategories = function () {
    var self = this;
    $.ajax({
        url: _contextPath + "/api/categories.do",
        dataType: "json",
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        success: function (data) {
            self.categories = data;

            var totalCount = 0;

            _.forEach(self.categories, function (c) {
                totalCount++;

                if (c.children) {
                    _.forEach(c.children, function(cc) {
                        totalCount++;
                        if (cc.children) {
                            totalCount += cc.children.length;
                        }
                    });
                }
            });
            $("#total-category-count").text(totalCount);
            if (self.categoryCodes.length == 0) {
                $(".selected-category-cnt").text(totalCount);
            }

            self.categoryTree = $("#category-tree-wrap").tree({
                primaryKey: 'id',
                uiLibrary: 'bootstrap',
                dataSource: self.categories,
                checkboxes: true
            });

            _.forEach(self.categoryCodes, function(code) {
                self.categoryTree.check($("li[data-id='" + code + "']"));
            });

            self.categoryTree.on('checkboxChange', function (e, $node, record, state) {
                self.categoryCodes = self.categoryTree.getCheckedNodes();
                if (self.categoryCodes.length > 0) {
                    $(".selected-category-cnt").text(self.categoryCodes.length);
                    $("#category-filter-btn").addClass('active');
                } else {
                    $(".selected-category-cnt").text(totalCount);
                    $("#category-filter-btn").removeClass('active');
                }
            });
        },
        error: function(err) {
            console.log(err);
        }
    });
}

DetailSearch.prototype.renderSubCategories = function(id, level, isChecked) {
    var self = this;

    if (parseInt(level) == 1) {
        var category = _.find(self.categories, function(c) {return c.id == id;});
        var subCategories = category.children;
        _.forEach(subCategories, function(sc) {
            if (isChecked !== undefined) {
                sc.isChecked = isChecked;
            } else {
                sc.isChecked = (self.categoryCodes.indexOf(sc.id) > -1);
            }
        });
        var subCategoryHtml = self.subCategoriesTemplate({ categories: subCategories });
        $(".category-list[data-level='2']").html(subCategoryHtml);
    }
}

DetailSearch.prototype.setProviderCodes = function(code, isChecked) {
    var self = this;
    self.providerCodes = self.providerCodes || [];

    if (isChecked) {
        self.providerCodes.push(code);
    } else {
        self.providerCodes.splice(self.providerCodes.indexOf(code), 1);
    }

    $(".provider-btn").removeClass("selected");
    if (self.providerCodes && self.providerCodes.length) {
        _.forEach(self.providerCodes, function (code) {
            $(".provider-btn[data-code='" + code + "']").addClass("selected");
        });

        $(".selected-provider-cnt").text(self.providerCodes.length);
    } else {
        self.clearProviderCodes();
    }
}

DetailSearch.prototype.clearProviderCodes = function() {
    var self = this;

    self.providerCodes = [];
    $(".provider-btn").removeClass("selected");
    $(".selected-provider-cnt").text(self.providers.length);
}

DetailSearch.prototype.setCategoryCodes = function(code, isChecked) {
    var self = this;

    if (isChecked) {
        self.categoryTree.check($("li[data-id='" + code + "']"));
    } else {
        self.categoryTree.uncheck($("li[data-id='" + code + "']"));
    }
}

DetailSearch.prototype.clearCategoryCodes = function() {
    this.categoryTree.uncheckAll();
}

DetailSearch.prototype.setIncidentCodes = function(code, isChecked) {
    var self = this;

    if (isChecked) {
        self.incidentTree.check($("li[data-id='" + code + "']"));
    } else {
        self.incidentTree.uncheck($("li[data-id='" + code + "']"));
    }
}

DetailSearch.prototype.clearIncidentCodes = function() {
    this.incidentTree.uncheckAll();
}

DetailSearch.prototype.renderSubIncidents = function(id, level, parent, isChecked) {
    var self = this;

    var subIncidents = [];
    var targetLevel = -1;

    if (parseInt(level) == 1) {
        targetLevel = 2;
        var incident = _.find(self.incidents, function(i) {
            return i.id == id;
        });
        subIncidents = incident.children;

        $(".incident-list[data-level='3']").html('');
    } else if (parseInt(level) == 2) {
        targetLevel = 3;
        var parentIncident = _.find(self.incidents, function(i) {return i.id == parent;});
        var incident = _.find(parentIncident.children, function(i) {return i.id == id;});
        subIncidents = incident.children;
    }

    _.forEach(subIncidents, function(si) {
        if (isChecked !== undefined) {
            si.isChecked = isChecked;
        } else {
            si.isChecked = (self.incidentCodes.indexOf(si.id) > -1);
        }
    });

    var subIncidentHtml = self.subIncidentsTemplate({ incidents: subIncidents });
    $(".incident-list[data-level='" + targetLevel + "']").html(subIncidentHtml);
}

DetailSearch.prototype.getNewsInidents = function () {
    var self = this;
    $.ajax({
        url: _contextPath + "/api/incidents.do",
        dataType: "json",
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        success: function (data) {
            self.incidents = data;

            var totalCount = 0;
            _.forEach(self.incidents, function (c) {
                totalCount++;

                if (c.children) {
                    _.forEach(c.children, function(cc) {
                        totalCount++;
                        if (cc.children) {
                            totalCount += cc.children.length;
                        }
                    });
                }
            });
            $("#total-incident-count").text(totalCount);

            if (self.incidentCodes.length == 0) {
                $(".selected-incident-cnt").text(totalCount);
            }

            self.incidentTree = $("#incident-tree-wrap").tree({
                primaryKey: 'id',
                uiLibrary: 'bootstrap',
                dataSource: self.incidents,
                checkboxes: true
            });

            _.forEach(self.incidentCodes, function(code) {
                self.incidentTree.check($("li[data-id='" + code + "']"));
            });

            self.incidentTree.on('checkboxChange', function (e, $node, record, state) {
                self.incidentCodes = self.incidentTree.getCheckedNodes();
                if (self.incidentCodes.length > 0) {
                    $(".selected-incident-cnt").text(self.incidentCodes.length);
                    $("#incident-filter-btn").addClass('active');
                } else {
                    $(".selected-incident-cnt").text(totalCount);
                    $("#incident-filter-btn").removeClass('active');
                }

            });
        },
        error: function(err) {
            console.log(err);
        }
    });
}

DetailSearch.prototype.addRow = function(searchKeyItem) {
    var item = _.assign(searchKeyItem, {seq: this.seq});

    this.$formWrap.append(this.rowTemplate(item));
    this.seq++;
}

DetailSearch.prototype.renderSearchKeys = function() {
    var self = this;
    self.seq = 0;
    self.$formWrap.html('');

    if (self.searchKeys && self.searchKeys.length) {
        _.forEach(self.searchKeys, function(searchKeyItem) {
            if (searchKeyItem.orKeywords) {
                searchKeyItem.orKeywordsStr = searchKeyItem.orKeywords.join(",");
                $(".detail-keyword.keyword-or").val(searchKeyItem.orKeywordsStr);
            }

            if (searchKeyItem.andKeywords) {
                searchKeyItem.andKeywordsStr = searchKeyItem.andKeywords.join(",");
                $(".detail-keyword.keyword-and").val(searchKeyItem.andKeywordsStr);
            }

            if (searchKeyItem.exactKeywords) {
                searchKeyItem.exactKeywordsStr = searchKeyItem.exactKeywords.join(",");
                $(".detail-keyword.keyword-exact").val(searchKeyItem.exactKeywordsStr);
            }

            if (searchKeyItem.notKeywords) {
                searchKeyItem.notKeywordsStr = searchKeyItem.notKeywords.join(",");
                $(".detail-keyword.keyword-not").val(searchKeyItem.notKeywordsStr);
            }

            self.addRow(searchKeyItem);
        });
    } else {
        self.addRow();
    }

    $(".tagsinput").tagsinput();
}

DetailSearch.prototype.deleteRow = function(seq) {
    $(".detail-search-row[data-seq='" + seq + "']").remove();
}

DetailSearch.prototype.getKeyItem = function(seq) {
    if (!this.searchKeys[seq]) {
        this.searchKeys[seq] = {
            keyword: "",
            orKeywords: [],
            andKeywords: [],
            exactKeywords: [],
            notKeywords: []
        };

        var $concatOption = $(".detail-search-row[data-seq='" + seq + "'] .concat-option");
        if ($concatOption.length) {
            this.searchKeys[seq].concatOption = $concatOption.val();
        }
    }

    return this.searchKeys[seq];
}

DetailSearch.prototype.setSelectedCnt = function () {
    var self = this;

    var selectedClasses = [
        ".visible .provider-area-btn." + self.selectedClass,
        ".visible .provider-btn." + self.selectedClass
    ];

    var totalCnt = 0;
    _.forEach(selectedClasses, function(selectedClassName) {
        totalCnt += $(selectedClassName).length;
    });

    self.providerCodes = [];
    _.forEach($(".provider-btn.selected"), function(selectedProvider) {
        self.providerCodes.push($(selectedProvider).data('code'));
    });

    if (totalCnt > 0) {
        $("#provider-filter-btn").addClass('active');
    }
    if (totalCnt == 0) {
        totalCnt = self.providers.length;
        $("#provider-filter-btn").removeClass('active');
    }
    $(".selected-provider-cnt").text(totalCnt);
}

DetailSearch.prototype.checkByAreaCode = function(areaCode) {
    $(".provider-btn[data-areacode='" + areaCode + "']").addClass(this.selectedClass);
    this.setSelectedCnt();
}

DetailSearch.prototype.unCheckByAreaCode = function(areaCode) {
    $(".provider-btn[data-areacode='" + areaCode + "']").removeClass(this.selectedClass);
    this.setSelectedCnt();
}

DetailSearch.prototype.checkByGubunCode = function(gubunCode) {
    $(".provider-btn[data-gubuncode='" + gubunCode + "']").addClass(this.selectedClass);
    this.setSelectedCnt();
}

DetailSearch.prototype.unCheckByGubunCode = function(gubunCode) {
    $(".provider-btn[data-gubuncode='" + gubunCode + "']").removeClass(this.selectedClass);
    this.setSelectedCnt();
}

DetailSearch.prototype.getKeywordItems = function(input, keyItem) {
    var $e = $(input);

    if ($e.hasClass("keyword-or")) {
        return keyItem.orKeywords;
    } else if ($e.hasClass("keyword-and")) {
        return keyItem.andKeywords;
    } else if ($e.hasClass("keyword-exact")) {
        return keyItem.exactKeywords;
    } else if ($e.hasClass("keyword-not")) {
        return keyItem.notKeywords;
    }

    return null;
}

DetailSearch.prototype.setSearchDetails = function(searchParams) {
    if (searchParams && !_.isEmpty(searchParams)) {
        var indexName = searchParams.indexName || "news";
        $("input[name='index-name']").val(indexName);
        $("input[name='search-type']").val(indexName);

        $("#search-filter-type").val(searchParams.searchFilterType || "1");
        $("#search-scope-type").val(searchParams.searchScopeType || "1");
        $("#search-sort").val(searchParams.searchSortType);
        $("#mainTodayPersonYn").val(searchParams.mainTodayPersonYn);
        $(".date-select-btn").removeClass("active");

        $("#search-begin-date").val(searchParams.startDate || moment().add(-3, "month").format("YYYY-MM-DD"));
        $("#search-end-date").val(searchParams.endDate || moment().format("YYYY-MM-DD"));

        $("#quotation-keyword2").val(searchParams.quotationKeyword2);
        $("#quotation-keyword3").val(searchParams.quotationKeyword3);

        if (searchParams.searchKeys && searchParams.searchKeys.length) {
            this.searchKeys = searchParams.searchKeys;
            this.renderSearchKeys();
        }

        if (searchParams.providerCodes) {
            this.preSelectedProviderCodes = searchParams.providerCodes;
            this.providerCodes = searchParams.providerCodes;
        }

        if (searchParams.categoryCodes) {
            this.categoryCodes = searchParams.categoryCodes;
        }

        if (searchParams.incidentCodes) {
            this.incidentCodes = searchParams.incidentCodes;
            this.incidentCodes = this.incidentCodes.map(String);
        }

        if (searchParams.dateCodes) {
            this.dateCodes = searchParams.dateCodes;
            $("#init-date-codes").val(JSON.stringify(this.dateCodes));
        }

        if (searchParams.newsIds && searchParams.newsIds.length) {
            this.newsIds = searchParams.newsIds;
        }
        
        if (searchParams.topicOrigin) {
        	this.topicOrigin = searchParams.topicOrigin;
        	$("#topicOrigin").val(this.topicOrigin);
        }

        this.setCategoryTotalCount();
    }
}

 DetailSearch.prototype.getFullKeyword = function() {
    var self = this;
    var result = $("#total-search-key").val();

    var withComma = result.replace(new RegExp(',', 'g'), ', ');
    var singleSpace = withComma.replace(new RegExp('  ', 'g'), ' ');
    result = singleSpace;

    var deatailSearchKeyOptions = [
        "or", "and", "exact", "not"
    ];
    self.searchKeys = [{}];

    _.forEach(deatailSearchKeyOptions, function(option) {
        var selectorName = ".detail-keyword.keyword-" + option;
        var valuesName = option + "Keywords";
        if($(selectorName).val()) {
            self.searchKeys[0][valuesName] = [$(selectorName).val()];
        }
    });

    _.forEach(this.searchKeys, function(item, key) {
        var temps = [];
        if (item.keyword) {
            temps.push(item.keyword);
        }

        if (item.orKeywords && item.orKeywords.length) {
            var orKeywordArr = [];
            _.forEach(item.orKeywords, function(keyword) {
                orKeywordArr = orKeywordArr.concat(keyword.split(","));
            });
            if (result) {
                temps.push(" AND ");
            }
            temps.push("(" + orKeywordArr.join(" OR ") + ")");
        }

        if (item.andKeywords && item.andKeywords.length) {
            var andKeywordArr = [];
            _.forEach(item.andKeywords, function(keyword) {
                andKeywordArr = andKeywordArr.concat(keyword.split(","));
            });
            if (result || temps.length) {
                temps.push(" AND ");
            }
            temps.push("(" + andKeywordArr.join(" AND ") + ")");
        }

        if (item.exactKeywords && item.exactKeywords.length) {
            var exactTemps = [];
            _.forEach(item.exactKeywords, function(keyword) {
                _.forEach(keyword.split(","), function(word) {
                    exactTemps.push("\"" + word + "\"");
                });
            });
            if (result || temps.length) {
                temps.push(" AND ");
            }
            temps.push("(" + exactTemps.join(" AND ") + ")");
        }

        if (item.notKeywords && item.notKeywords.length) {
            var noteTemps = [];
            noteTemps.push(" NOT(");
            _.forEach(item.notKeywords, function(keyword) {
                _.forEach(keyword.split(","), function(word) {
                    noteTemps.push(word);
                });
            });
            noteTemps.push(")");

            temps.push(noteTemps.join(""));
        }

        if (item.concatOption) {
            result += " " + item.concatOption + " ";
        }

        result += temps.join(" ");
    });

    if ($("#rescan-keyword").val()) {
        var rescanKeyword = $("#rescan-keyword").val();
        var rescanKeywordArr = [];
        rescanKeywordArr = rescanKeywordArr.concat(rescanKeyword.split(","));
        if (rescanKeywordArr.length) {
            rescanKeyword = rescanKeywordArr.join(" AND ");
        }

        if (result) {
            result = "(" + result + ") AND " + rescanKeyword;
        } else {
            result = "(" + rescanKeyword + ")";
        }
    }

    if ($("#rescan-except-keyword").val()) {
        var rescanExceptKeyword = $("#rescan-except-keyword").val();
        var rescanExceptKeywordArr = [];
        rescanExceptKeywordArr = rescanExceptKeywordArr.concat(rescanExceptKeyword.split(","));

        if (rescanExceptKeywordArr.length) {
            rescanExceptKeyword = rescanExceptKeywordArr.join(" NOT ");
        }

        if (result) {
            result = "(" + result + ") NOT " + rescanExceptKeyword;
        } else {
            result = "";
        }
    }

    return result;
}

DetailSearch.prototype.setFullKeyword = function () {
    this.fullSearchKey = this.getFullKeyword();
    $("#total-search-key").val(this.fullSearchKey);
}

DetailSearch.prototype.clearDateFilter = function() {
    var self = this;
    self.initDatepicker();
    $(".date-select-btn[data-value='3'][data-type='month']").trigger("click");
    $("#date-filter-div").toggleClass("open",false);
}

DetailSearch.prototype.clearProviderFilter = function() {
    var self = this;
    $(".provider-area-btn").prop("checked", false);
    $(".gubun-checkbox").prop("checked", false);
    $(".provider-btn").removeClass("selected");
    $(".provider-area-btn").removeClass("selected");
    self.setSelectedCnt();
}

DetailSearch.prototype.clearCategoryFilter = function() {
    var self = this;
    $(".category-checkbox").prop("checked", false);
    self.categoryCodes = [];
    self.clearCategoryCodes();
}

DetailSearch.prototype.clearIncidenetFilter = function() {
    var self = this;
    $(".incident-checkbox").prop("checked", false);
    self.incidentCodes = [];
    self.clearIncidentCodes();
}

DetailSearch.prototype.clearByline = function() {
    $("#byline").val("");
}

DetailSearch.prototype.clearRescanKeyword = function() {
    $("#rescan-keyword").val("");
    $("#rescan-except-keyword").val("");
}

DetailSearch.prototype.clearFilter = function() {
    var self = this;
    self.clearDateFilter();
    self.clearProviderFilter();
    self.clearCategoryFilter();
    self.clearIncidenetFilter();
    self.clearByline();
    self.clearRescanKeyword();
    self.clearDetails();
}

DetailSearch.prototype.clearDetails = function() {
    $("#search-filter-type").val("1");
    $("#search-scope-type").val("1");
    $("#orKeyword1").val("");
    $("#andKeyword1").val("");
    $("#exactKeyword1").val("");
    $("#notKeyword1").val("");
    $("#total-search-key-copy").val("");
    $("#quotation-keyword1").val("");
    $("#quotation-keyword2").val("");
    $("#quotation-keyword3").val("");
    $("#byline").val("");
}

DetailSearch.prototype.getFormData = function () {
    var self = this;

    var providerCodes = [];
    _.forEach($(".provider-btn.selected"), function(provider) {
        providerCodes.push($(provider).data("code"));
    });

    var deatailSearchKeyOptions = [
        "or", "and", "exact", "not"
    ];

    var searchKeys = [{}];
    _.forEach(deatailSearchKeyOptions, function(option) {
        var selectorName = ".detail-keyword.keyword-" + option;
        var valuesName = option + "Keywords";
        if($(selectorName).val()) {
            searchKeys[0][valuesName] = [$(selectorName).val()];
        }
    });

    var indexName = $("input[name='index-name']").val();
    var searchKey = $("#total-search-key").val();

    var tmp1 = $(".result-filter.sort").val() == null ? "date" : $(".result-filter.sort").val();
    
    var formData = {
        indexName: indexName,
        searchKey: searchKey,
        searchKeys: searchKeys,
        byLine: $("#byline").val(),
        searchFilterType: $("#search-filter-type").val(),
        searchScopeType: $("#search-scope-type").val(),
        searchSortType:  $(".result-filter.sort").val(),
        sortMethod:  $(".result-filter.sort").val(),
        mainTodayPersonYn: $("#mainTodayPersonYn").val(),
        startDate: $("#search-begin-date").val(),
        endDate: $("#search-end-date").val(),
        newsIds: self.newsIds,
        categoryCodes: self.categoryCodes,
        providerCodes: self.providerCodes,
        incidentCodes: self.incidentCodes,
        networkNodeType: $("#networkNodeType").val(),
        topicOrigin: $("#topicOrigin").val()
    };

    if (indexName == "news_quotation") {
        var quotationKeyword1 = $("#quotation-keyword1").val();
        var quotationKeyword2 = $("#quotation-keyword2").val();
        var quotationKeyword3 = $("#quotation-keyword3").val();

        if (quotationKeyword1) {
            formData.quotationKeyword1 = quotationKeyword1;
        } else {
            formData.quotationKeyword1 = searchKey;
        }
        formData.quotationKeyword2 = quotationKeyword2;
        formData.quotationKeyword3 = quotationKeyword3;
        if (!quotationKeyword2 && !quotationKeyword3) {
        } else {
            formData.searchFilterType = "2";
            $("#search-filter-type").val("2");
        }

        if ($("#total-search-key-copy").val()) {
            formData.searchFilterType = "2";
            $("#search-filter-type").val("2");
        }
    }

    if (formData.mainTodayPersonYn == "Y") {
        formData.searchFilterType = $("#search-analyzer").val();
        formData.searchScopeType = $("#search-scope").val();
    }

    return formData;
}

DetailSearch.prototype.setCategoryTotalCount = function() {
    var self = this;
    $(".selected-category-cnt").text(self.categoryCodes.length);
    $(".selected-incident-cnt").text(self.incidentCodes.length);

    var totalCount = self.categoryCodes.length + self.incidentCodes.length;

    if (totalCount == 0) { totalCount = 145; }
    $(".selected-category-total-cnt").text(totalCount);
}

DetailSearch.prototype.setSearhGroup = function(indexType) {
    var self = this;
    self.$indexType.val(indexType);
    $(".detail-search-group").hide();
    $(".detail-search-group[data-group='" + indexType + "']").show();
}

DetailSearch.prototype.initEvent = function() {
    var self = this;

    $(".detail-keyword").keypress(function(e) {
        if (e.which == 13) {
            e.preventDefault();
        }
    });

    $(document).on("click", ".search-form-body .static-dropdown-menu", function(e) {
        e.stopPropagation();
    });

    $("input[name='search-index-type']").change(function(e) {
        var indexType = $(this).val();
        self.setSearhGroup(indexType);
    });

    // $(".search-form-body a[data-toggle='tab']").click(function(e) {
    //     e.preventDefault();
    //     $(this).tab('show');
    // });

    $(".detail-clear-btn").click(function(e) {
        self.clearDetails();
    });

    $(document).on("keyup", ".detail-search-row .keyword", function(e) {
        var seq = $(this).data("seq");
        var keyItem = self.getKeyItem(seq);
        keyItem.keyword = $(this).val();

        self.setFullKeyword();
    });

    $(".date-select-btn").click(function(e) {
        if (!$(this).hasClass("active")) {
            $(".date-select-btn").removeClass("active");
            $(this).addClass("active");
        }

        var type = $(this).data("type");
        var value = parseInt($(this).data("value"));

        var beginDateStr = "";
        var endDateStr = "";

        if (type !== "all") {
            beginDateStr = moment().subtract(value, type).format("YYYY-MM-DD");
            endDateStr = moment().format("YYYY-MM-DD");
        } else {
            beginDateStr = "1990-01-01";
            endDateStr = moment().format("YYYY-MM-DD");
        }

        $("#search-begin-date").val(beginDateStr);
        $("#search-end-date").val(endDateStr);
    });

    $(document).on("click", ".provider-area-btn", function(e) {
        var areaCode = $(this).data("areacode");

        if ($(this).hasClass(self.selectedClass)) {
            $(this).removeClass(self.selectedClass);
            self.unCheckByAreaCode(areaCode);
        } else {
            $(this).addClass(self.selectedClass);
            self.checkByAreaCode(areaCode);
        }
    });

    $(document).on("click", ".provider-btn", function(e) {
        var gubunCode = $(this).data('gubuncode');
        var areaCode = $(this).data('areacode');

        if ($(this).hasClass(self.selectedClass)) {
            $(this).removeClass(self.selectedClass);
        } else {
            $(this).addClass(self.selectedClass);
        }

        if ($(".selected.provider-btn[data-gubuncode="+ gubunCode +"]").length == 0) {
            $(".gubun-checkbox[value="+ gubunCode +"]").prop("checked", false);
        }

        if ($(".selected.provider-btn[data-areacode="+ areaCode +"]").length == 0) {
            $(".provider-area-btn[data-areaCode="+ gubunCode +"]").prop("checked", false);
        }

        self.setSelectedCnt();
    });

    $(document).on("change", ".gubun-checkbox", function(e) {
        var gubunCode = $(this).val();

        if ($(this).is(":checked")) {
            self.checkByGubunCode(gubunCode);
        } else {
            self.unCheckByGubunCode(gubunCode);
        }
    });

    $(document).on("click", ".category-checkbox-label, .category-checkbox-wrap", function(e) {
        var id = $(this).data("id");
        var level = $(this).data("level");

        self.renderSubCategories(id, level);
    });

    $(document).on("change", ".category-checkbox", function(e) {
        var id = $(this).data('id');
        var level = $(this).data("level");
        var isChecked = $(this).is(":checked");

        self.renderSubCategories(id, level, isChecked);

        var targetCategories = [id];

        if (level == 1) {
            var category = _.find(self.categories, function(c) {return c.id == id;});
            var subCategoryIds = _.map(category.children, "id");
            targetCategories = _.concat(targetCategories, subCategoryIds);
        }

        if (isChecked) {
            self.categoryCodes = _.uniq(_.concat(self.categoryCodes, targetCategories));
        } else {
            self.categoryCodes = _.difference(self.categoryCodes, targetCategories);
        }

        _.forEach(targetCategories, function(categoryCode) {
            $(".category-checkbox[data-id='" + categoryCode + "']").prop("checked", isChecked);
        });

        self.setCategoryTotalCount();
    });


    $(".main-search-filter-init").click(function(e) {
        e.preventDefault();
        self.clearFilter();
    });

    $(document).on("click", ".incident-checkbox-label", function(e) {
        var id = $(this).data("id");
        var level = $(this).data("level");
        var parent = $(this).data('parent');

        self.renderSubIncidents(id, level, parent);
    });

    $(".close-filter-btn").click(function(e) {
        $(".dropdown").removeClass("open");
    });

    $(document).on("change", ".incident-checkbox", function(e) {
        var id = "" + $(this).data('id');
        var level = $(this).data("level");
        var parent = $(this).data('parent');
        var isChecked = $(this).is(":checked");

        self.renderSubIncidents(id, level, parent, isChecked);

        var targetIncidents = [id];

        if (level == 1) {
            var incident = _.find(self.incidents, function(c) {return c.id == id;});
            var subIncidentIds = _.map(incident.children, "id");
            targetIncidents = _.concat(targetIncidents, subIncidentIds);

            _.forEach(incident.children, function(child) {
                targetIncidents = _.concat(targetIncidents, _.map(child.children, "id"));
            });
        } else if (level == 2) {
            var parentIncident = _.find(self.incidents, function(c) {return c.id == parent;});
            var incident = _.find(parentIncident.children, function(c) {return c.id == id;});
            var subIncidentIds = _.map(incident.children, "id");
            targetIncidents = _.concat(targetIncidents, subIncidentIds);
        }

        if (isChecked) {
            self.incidentCodes = _.uniq(_.concat(self.incidentCodes, targetIncidents));
        } else {
            self.incidentCodes = _.difference(self.incidentCodes, targetIncidents);
        }

        _.forEach(targetIncidents, function(incidentCode) {
            $(".incident-checkbox[data-id='" + incidentCode + "']").prop("checked", isChecked);
        });

        self.setCategoryTotalCount();
    });

    $(".rescan-btn").click(function(e) {
        var rescanKeyword = $("#rescan-keyword").val();
        if (rescanKeyword) {
            var searchKey = $("#total-search-key").val();
            if (searchKey) {
                searchKey = rescanKeyword + " AND (" + searchKey + ")";
            } else {
                searchKey = rescanKeyword;
            }

            $("#total-search-key").val(searchKey);
        } else {
            alert("등록 된 키워드가 없습니다.");
        }
    });

    $(document).on("click", ".detail-search-row .add-row-btn", function(e) {
        self.addRow();
    });

    $(document).on("click", ".detail-search-row .remove-row-btn", function(e) {
        var seq = $(this).data('seq');
        self.deleteRow(seq);
        delete self.searchKeys[seq];
        self.setFullKeyword();
    });

    $(document).on("itemAdded", ".tagsinput", function(e) {
        e.stopPropagation();
        e.preventDefault();

        var itemVal = e.item;
        var seq = $(this).data("seq");
        var keyItem = self.getKeyItem(seq);
        var keywordItems = self.getKeywordItems($(this), keyItem);

        if (keywordItems && keywordItems.indexOf(itemVal) < 0) {
            keywordItems.push(itemVal);
        }

        // self.setFullKeyword();
    });

    $(document).on("itemRemoved", ".tagsinput", function(e) {
        var itemVal = e.item;
        var seq = $(this).data("seq");
        var keyItem = self.getKeyItem(seq);
        var keywordItems = self.getKeywordItems($(this), keyItem);

        if (keywordItems) {
            _.remove(keywordItems, function(keyword) {
                return keyword === itemVal;
            });
        }

        // self.setFullKeyword();
    });

    $(".close-detail-search-btn").click(function(e) {
        $("#advanced-search-options").removeClass("active");
    });

    $(".clear-filter-btn").click(function(e) {
        var type = $(this).data('type');
        switch (type) {
            case "date":
                self.clearDateFilter();
                break;
            case "provider":
                self.clearProviderFilter();
                break;
            case "category":
                self.clearCategoryFilter();
                break;
            case "incident":
                self.clearIncidenetFilter();
                break;
            case "byline":
                self.clearByline();
                break;
            case "rescan":
                self.clearRescanKeyword();
        };
    });
}
