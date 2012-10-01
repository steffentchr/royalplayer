/* Dependencies:
  <script src="http://video.kglteater.dk/resources/um/script/swfobject/swfobject.js"></script>
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
  <script src="https://raw.github.com/carhartl/jquery-cookie/master/jquery.cookie.js"></script>
  <script src="https://raw.github.com/23/eingebaut/master/eingebaut.js"></script>
  <script src="https://raw.github.com/23/visualplatform.js/master/visualplatform.js"></script>
*/

(function($){
    var $this = this;
    $this.domain = 'video.kglteater.dk';
    $this.api = new Visualplatform($this.domain);
    $this.photo = null;
    $this.eingebaut = null;
    $this.bannerType = '';
    
    // Set cookie for tracking
    $.cookie('_visual_swf_referer', document.referrer);

    // Maintain state for CSS
    $this.setState = function(state){
      $this.body.removeClass('loaded').removeClass('playing').removeClass('paused').removeClass('ended');
      $this.body.addClass(state);
    }

    // Monitor updates in video playback through Eingebaut
    $this.eingebautCallback = function(e){
      switch(e){
      case 'ready':
        if ($this.bannerType=='lead') $this.eingebaut.setPoster('http://' + $this.domain + $this.photo.large_download);
        if($this.autoPlayOnLoad) $this.eingebaut.setPlaying(true);
        break;
      case 'progress':
      case 'timeupdate':
        try {
          $('#progress').css({width:(($this.eingebaut.getCurrentTime()/$this.eingebaut.getDuration())*100) + '%'});
        }catch(e){}
        break;
      case 'pause':
        $this.setState('paused');
        break;
      case 'playing':
        $this.setState('playing');
        break;
      case 'ended':
        $this.setState('ended');
        break;
      }
    }

    // Handle playback and pausing
    $this.togglePlay = function(e){
      if($this.eingebaut.getSource()=='') {
        if($this.eingebaut.canPlayType('video/mp4; codecs="avc1.42E01E"')) {
          $this.eingebaut.setSource('http://' + $this.domain + $this.photo.video_medium_download);
        } else {
          $this.eingebaut.setSource('http://' + $this.domain + $this.photo.video_webm_360p_download);
        }
      }
      $this.eingebaut.setPlaying(!$this.eingebaut.getPlaying());
      
      // Don't do anything else
      if(e&&e.stopPropagation) e.stopPropagation();
      return(false);
    }

    // Load data and the application
    $this.loadBanner = function(photo){
        $this.photo = photo;
        $this.body = $('body');

        // iPhone without play buttons
        if(navigator.userAgent.match(/iPhone/i)) $this.body.addClass('iphone');

        // Title, image, links
        if($(document).width()==300) {
          $this.bannerType = 'box';
          $('#image').attr('src', 'http://' + [$this.domain, $this.photo.tree_id, $this.photo.photo_id, $this.photo.token, 'file', 'box.jpg'].join('/'));
          $('#imagelink, #video, #play, #pause').click($this.togglePlay);
        } else {
          $this.bannerType = 'lead';
          $('#image').attr('src', 'http://' + [$this.domain, $this.photo.tree_id, $this.photo.photo_id, $this.photo.token, 'file', 'lead.jpg'].join('/'));
          $('#video, #play, #pause').click($this.togglePlay);
        }
        $this.body.addClass($this.bannerType);
        $('#visit, #title, #readmorelink, #imagelink').attr('href', $this.photo.banner_link);
        $('#title').html($this.photo.banner_title||$this.photo.title);
        $('#playagain').click(function(){
            $this.setState('playing');
            $this.eingebaut.setCurrentTime(0);
            $this.eingebaut.setPlaying(true);
          });

        // Animate pause button on enter/leave
        $this.body.mouseleave(function() {
            $('#pause').animate({opacity:0}, 300);
          });
        $this.body.mouseenter(function() {
            $('#pause').animate({opacity:1}, 300);
          });
        $('#image').mouseenter(function() {
            $('#pause').animate({opacity:0}, 300);
          });
        $('#image').mouseleave(function() {
            $('#pause').animate({opacity:1}, 300);
          });
        
        // Load player
        $this.eingebaut =  new Eingebaut($('#video'), 'html5', 'http://video.kglteater.dk/7095378.swf', $this.eingebautCallback);
        $this.eingebaut.load();

        // We're ready
        $this.setState('loaded');
        $this.reportAnalyticsEvent('load');
    }

    // Each report should include extra data as context
    $this.analyticsContext = function(o){
      $.extend(o,$this.parameters);
      o.photo_id = $this.photo.photo_id;
      o.type = 'clip';
      try {
        o.user_player_type = $this.eingebaut.displayDevice;
      }catch(e){}
      o.user_player_resolution = screen.width+'x'+screen.height;
      return o;
    }
    $this.reportAnalyticsEvent = function(event){
      $this.api.analytics.report.event($this.analyticsContext({event:event}));
    }
    $this.reportAnalyticsPlay = function(event){
      if($this.eingebaut&&$this.eingebaut.getCurrentTime&&$this.eingebaut.getCurrentTime()>0) {
        $this.api.analytics.report.play($this.analyticsContext({time_start:0, time_end:$this.eingebaut.getCurrentTime(), time_total:$this.eingebaut.getDuration()}));
      }
    }
    window.setInterval($this.reportAnalyticsPlay, 5000);

    // Bootstrap everything by loading data from 23 Video API
    $this.parametersString = location.search.substr(1);
    $this.parameters = {};
    if($this.parametersString.length>0){
      $.each($this.parametersString.split('&'), function(i,comp){
          var s = comp.split('=');
          $this.parameters[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
        });
    }
    $this.api.photo.list(
        $.extend($this.parameters, {source:'embed', size:1}),
        function(data){
            $this.loadBanner(data.photos[0]);
        },
        function(){}
    );
})(jQuery);
