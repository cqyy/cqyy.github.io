$(document).ready(function(){

	$('pre').addClass('prettyprint linenums'); 
	prettyPrint();
	
	$('.post-body a').each(function(index,element){
        var href = $(this).attr('href');
        if(href){
            if(href.indexOf('#') == 0){
            }else if ( href.indexOf('/') == 0 || href.toLowerCase().indexOf('beiyuu.com')>-1 ){
            }else if ($(element).has('img').length){
            }else{
                $(this).attr('target','_blank');
                $(this).addClass('external');
            }
        }
    });

    (function(){
        
        function initHeading(){
            var h2 = [];
            var h3 = [];
            var h2index = 0;

            $.each($('.post-body h2, .post-body h3'),function(index,item){
                if(item.tagName.toLowerCase() == 'h2'){
                    var h2item = {};
                    h2item.name = $(item).text();
                    h2item.id = 'menuIndex'+index;
                    h2.push(h2item);
                    h2index++;
                }else{
                    var h3item = {};
                    h3item.name = $(item).text();
                    h3item.id = 'menuIndex'+index;
                    if(!h3[h2index-1]){
                        h3[h2index-1] = [];
                    }
                    h3[h2index-1].push(h3item);
                }
                item.id = 'menuIndex' + index;
            });
			
            return {h2:h2,h3:h3}
        }

        function genTmpl(){
            //var h1txt = $('h1').text();
            var tmpl = '';

            var heading = initHeading();
            var h2 = heading.h2;
            var h3 = heading.h3;

            for(var i=0;i<h2.length;i++){
                tmpl += '<li><a href="#" data-id="'+h2[i].id+'">'+h2[i].name+'</a></li>';

                if(h3[i]){
                    for(var j=0;j<h3[i].length;j++){
                        tmpl += '<li class="h3"><a href="#" data-id="'+h3[i][j].id+'">'+h3[i][j].name+'</a></li>';
                    }
                }
            }
            //tmpl += '</ul>';

            return tmpl;
        }

        function genIndex(){
            var tmpl = genTmpl();
            var indexCon = '<div id="menuIndex" class="sidenav"></div>';

            //$('#content').append(indexCon);

            $('#menuIndex')
                .append($(tmpl))
                .delegate('a','click',function(e){
                    e.preventDefault();

                    var selector = $(this).attr('data-id') ? '#'+$(this).attr('data-id') : 'h1'
                    var scrollNum = $(selector).offset().top;

                    $('body, html').animate({ scrollTop: scrollNum-30 }, 400, 'swing');
                });
        }

        var waitForFinalEvent = (function () {
            var timers = {};
            return function (callback, ms, uniqueId) {
                if (!uniqueId) {
                    uniqueId = "Don't call this twice without a uniqueId";
                }
                if (timers[uniqueId]) {
                    clearTimeout (timers[uniqueId]);
                }
                timers[uniqueId] = setTimeout(callback, ms);
            };
        })();

        if($('.post-body h2').length > 2){

            genIndex();

            $(window).load(function(){
                var scrollTop = [];
                $.each($('#menuIndex li a'),function(index,item){
                    var selector = $(item).attr('data-id') ? '#'+$(item).attr('data-id') : 'h1'
                    var top = $(selector).offset().top;
                    scrollTop.push(top);
                });

                var menuIndexTop = $('#menuIndex').offset().top;
                var menuIndexLeft = $('#menuIndex').offset().left;

                $(window).resize(function(){
                    $('#menuIndex').css({
                        position:'static'
                        ,top:0
                        ,left:0
                    });

                    menuIndexTop = $('#menuIndex').offset().top;
                    menuIndexLeft = $('#menuIndex').offset().left;

                    $(window).trigger('scroll')
                    $('#menuIndex').css('max-height',$(window).height()-80);
                });
            })
        }
    })();
});