AWS.config.region = 'ap-northeast-2';
AWS.config.accessKeyId = 'AKIAINHSTWKUVEDUCBGQ';
AWS.config.secretAccessKey = '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';

/* Text-to-Speach 연계 */
var NewsSpeecher = function(playerId, options) {
    this.polly = new AWS.Polly({apiVersion: '2016-06-10'});
    this.voiceUrl = "";
    this.hasUrl = false;
    this.playerId = playerId || "#audio-player";
    this.$player = $(this.playerId);
    this.options = options || {};
    this.text = "";

    this.options = _.assign({
        OutputFormat: 'mp3', /* required */
        VoiceId: 'Seoyeon', /* required */
        SampleRate: '22050',
        TextType: 'ssml'
    }, options);
}

NewsSpeecher.prototype.setText = function(text) {
    if (text !== this.text) {
        this.text = text;
        this.hasUrl = false;
    }
}

NewsSpeecher.prototype.speeach = function(isEscape) {
    var self = this;

    if (!self.hasUrl) {
        self.options.Text = self.getSSML();

        self.polly.synthesizeSpeech(self.options, function(err, data) {
            if (!err) {
                var uInt8Array = new Uint8Array(data.AudioStream);
                var arrayBuffer = uInt8Array.buffer;

                // Should work in Safari/on mobile
                var blob = new Blob([arrayBuffer], {type: 'audio/mpeg'});
                self.voiceUrl = URL.createObjectURL(blob);
                self.$player.attr("src", self.voiceUrl);
                // self.$player[0].play();

                self.hasUrl = true;
            } else {
                console.log(err, err.stack); // an error occurred
            }
        });

        self.$player[0].play();
    } else {
        self.$player[0].play();
    }
}

NewsSpeecher.prototype.pause = function() {
    this.$player[0].pause();
}

NewsSpeecher.prototype.stop = function() {
    this.pause();
    this.$player.attr("src", this.voiceUrl);
}

NewsSpeecher.prototype.getSSML = function() {
    var result = [];
    result.push("<speak>");

    var speechText = this.text.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "")
        .replace(/'/g, '"')
        .replace(/&/g, 'and')
    result.push(speechText);

    result.push("</speak>");

    return result.join("");
}