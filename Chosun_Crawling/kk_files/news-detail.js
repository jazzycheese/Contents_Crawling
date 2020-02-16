var NewsDetail = function() {
    this.$newsDetailModal = $("#news-detail-modal");
    this.newsDetailTemplate = Handlebars.getTemplate("home/news-detail-modal");

    this.currentNewsDetail = null;
    this.newsSpeacher = new NewsSpeecher("#audio-player");

    this.initEvent();
}

NewsDetail.prototype.show = function(newsId) {
    var self = this;

    $.getJSON("/news/detailView.do", {
        docId: newsId,
        returnCnt: 1,
        sectionDiv: 1000,
    }, function(data) {
        self.currentNewsDetail = data.detail;

        if (self.currentNewsDetail.IMAGES && self.currentNewsDetail.IMAGES.split(",").length > 1) {
            self.currentNewsDetail.IMAGES = self.currentNewsDetail.IMAGES.split(",")[0];
        }

        self.currentNewsDetail.CATEGORY_CODE = self.currentNewsDetail.CATEGORY_CODE.replace(/\s/g, ",");
        
        var rgx = new RegExp("^http");
        //원본주소 문자열에 프로토콜이 존재하는지 확인 후 없으면 http:// 추가
        if(self.currentNewsDetail.PROVIDER_LINK_PAGE != "" && rgx.test(self.currentNewsDetail.PROVIDER_LINK_PAGE) == false){
        	self.currentNewsDetail.PROVIDER_LINK_PAGE = "http://"+self.currentNewsDetail.PROVIDER_LINK_PAGE;
        }
        
        var detailHtml = self.newsDetailTemplate(self.currentNewsDetail);
        self.$newsDetailModal.html(detailHtml);
        self.$newsDetailModal.modal('show');

        if (authManager.hasAuth()) {
            var myData = {
                recentNewsId: self.currentNewsDetail.NEWS_ID,
                recentNewsCategory: self.currentNewsDetail.CATEGORY_CODE.replace(/\s/g, ",")
            }

            $.ajax({
                url: _contextPath + "/api/myNews/createMyRecent.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(myData),
                success: function(d) {
                    // console.log(d);
                }, error: function(err) {
                    console.log(err);
                }
            });
        }
    });
}

NewsDetail.prototype.resizeText = function(multiplier) {
    var $content = $(".news-detail__content");
    var font_size = $content.css('fontSize');
    if (font_size == "") {
        $content.css({'fontSize': '14px'});
    };
    var resize = parseFloat(font_size) + (multiplier * 2);
    var resize_font = resize.toString().concat("px");
    $content.css({'fontSize': resize_font});
}

NewsDetail.prototype.initEvent = function() {
    var self = this;

    $(document).on("click", ".btn-scrap", function(e) {
        if (authManager.checkAuth()) {
            var newsId = $(this).data("newsid");
            var categoryCodes = $(this).data("category");

            var scrapData = {
                scrapNewsId: newsId,
                scrapNewsCategory: categoryCodes
            };

            $.ajax({
                url: _contextPath + "/api/private/scrap/create.do",
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(scrapData),
                success: function (data) {
                    if (data) {
                        alert("정상처리 되었습니다. 스크랩 기사는 나의 메뉴에서 확인하실 수 있습니다.");
                    }
                }, error: function(err) {
                    console.log(err);
                }
            });
        }
    });

    $(document).on("click", ".speech-btn", function(e) {
        $(this).addClass("hidden");
        $(".pause-speech-btn").removeClass("hidden");
        $(".stop-speech-btn").removeClass("hidden");

        self.newsSpeacher.setText(self.currentNewsDetail.CONTENT);
        self.newsSpeacher.speeach();

        ga('send', 'event', 'NewsDetail', 'play');
    });

    $(document).on("click", ".pause-speech-btn", function(e) {
        $(this).addClass("hidden");
        $(".speech-btn").removeClass("hidden");
        self.newsSpeacher.pause();

        ga('send', 'event', 'NewsDetail', 'pause');
    });

    $(document).on("click", ".stop-speech-btn", function(e) {
        $(".pause-speech-btn").addClass("hidden");
        $(".stop-speech-btn").addClass("hidden");

        $(".speech-btn").removeClass("hidden");
        self.newsSpeacher.stop();

        ga('send', 'event', 'NewsDetail', 'stop');
    });

    $("#news-detail-modal").on('hidden.bs.modal', function () {
        self.newsSpeacher.stop();
    });

    $(document).on("click", ".news-detail", function() {
        var newsId = $(this).data("newsid");
        self.show(newsId);
    });

    $(document).on("click", "#plus-text-btn", function() {
        self.resizeText(1);
    });

    $(document).on("click", "#minus-text-btn", function() {
        self.resizeText(-1);
    });

    $(document).on("click", ".sns-share-btn", function(e) {
        var type = $(this).data('type');
        var share_url = "http://www.bigkinds.or.kr/news/newsDetailView.do?newsId=";
        var newsId = $(this).data("newsid");

        if (type == 'facebook') {
            var link = "https://www.facebook.com/sharer/sharer.php?u=";
            window.open(link.concat(share_url, newsId));
        }

        if (type == 'twitter') {
            var link = "https://twitter.com/share?url=";
            window.open(link.concat(share_url, newsId));
        }

        if (type == 'kakao') {
            Kakao.init('eb440084ece01496e0ae32c64ceec1e3');
            // 스토리 공유 버튼을 생성합니다.
            Kakao.Story.share({
                url: share_url.concat(newsId),
                text: $(this).data('newstitle')
            });
        }
    });
}