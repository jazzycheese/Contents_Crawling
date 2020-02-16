var HistoryData = function(newsResult) {
    this.newsResult = newsResult;

    this.$historyWrap = $("#history-wrap");
    this.historyTemplate = Handlebars.getTemplate("news/history");
    this.dateFormat = "YYYY/MM/DD";

    this.$loader = $(".viz-history > .analysis-viz-loader");

    this.getHistory();
}

HistoryData.prototype.getHistory = function() {
    var self = this;

    self.$loader.show();
    $.ajax({
        url: _contextPath + "/api/search/history.do",
        contentType: "application/json;charset=utf-8",
        dataType: "json",
        method: "POST",
        data: JSON.stringify(self.newsResult.resultParams),
        success: function(d) {
            if(d) {
                self.$loader.hide();

                self.histories = d.data;
                _.forEach(self.histories, function(history) {
                    history.formatted_date = moment(history.date).format(self.dateFormat);
                });

                self.renderHistory();
            }
        }, error: function(e) {
            console.log(e);
            self.$loader.hide();
        }
    });
}

HistoryData.prototype.renderHistory = function() {
    var self = this;

    var historyHtml = self.historyTemplate({ histories: self.histories });
    self.$historyWrap.html(historyHtml);
}