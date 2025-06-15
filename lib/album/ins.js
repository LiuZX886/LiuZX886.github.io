/**
 * ===================================================================
 * ins.js - 相册功能重构版
 * 最终版本：使用现代、简洁、可靠的原生JavaScript
 * 包含了智能依赖检测，确保稳定运行
 * ===================================================================
 */

// 使用一个立即执行的匿名函数（IIFE）来包裹代码，避免污染全局作用域
(function() {
    'use strict';

    /**
     * 从 JSON 文件异步获取照片数据。
     * @param {function(object): void} callback - 数据成功加载后要执行的回调函数。
     */
    function loadPhotoData(callback) {
        // 在URL后添加时间戳，防止浏览器缓存旧的data.json文件
        var dataUrl = '../lib/album/data.json?t=' + new Date().getTime();

        fetch(dataUrl)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('网络响应失败: ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (data && data.list && data.list.length > 0) {
                    callback(data); // 成功获取并解析数据后，执行回调
                } else {
                    console.error('错误：加载的数据为空或格式不正确。');
                }
            })
            .catch(function(error) {
                console.error('错误：获取或解析照片数据时失败：', error);
            });
    }

    /**
     * 将整个照片画廊渲染到DOM中。
     * @param {object} data - 从 data.json 加载的照片数据。
     */
    function renderGallery(data) {
        var instagramContainer = document.querySelector('.instagram');
        if (!instagramContainer) {
            console.error('错误：未找到主容器 ".instagram"。');
            return;
        }

        // 使用 .map() 遍历数据，生成每个月份的HTML
        var allSectionsHtml = data.list.map(function(monthlyData) {
            var photoData = monthlyData.arr;
            
            // 为该月份的每张照片生成HTML
            var photosHtml = photoData.link.map(function(link, i) {
                var minSrc = 'https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/min_photos/' + link;
                var src = 'https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/photos/' + link;
                var imageSize = photoData.size && photoData.size[i] ? photoData.size[i] : '1080x1080';
                var caption = photoData.text && photoData.text[i] ? photoData.text[i] : '';

                return (
                    '<figure class="thumb" itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">' +
                        '<a href="' + src + '" itemprop="contentUrl" data-size="' + imageSize + '">' +
                            '<img class="lazyload" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" ' +
                                 'data-src="' + minSrc + '" itemprop="thumbnail" alt="' + caption + '">' +
                        '</a>' +
                        '<figcaption style="display:none" itemprop="caption description">' + caption + '</figcaption>' +
                    '</figure>'
                );
            }).join('');

            // 将单个月份的所有照片组合成一个 <section>
            return (
                '<section class="archives album">' +
                    '<h1 class="year">' + photoData.year + '年<em>' + photoData.month + '月</em></h1>' +
                    '<div class="img-box-ul">' + photosHtml + '</div>' +
                '</section>'
            );
        }).join('');

        // 将最终生成的完整HTML注入到页面中
        instagramContainer.innerHTML = '<div class="photos" itemscope itemtype="http://schema.org/ImageGallery">' + allSectionsHtml + '</div>';
        
        // 在HTML渲染完成后，初始化所有需要的插件
        initPlugins();
    }

    /**
     * 初始化所有必需的插件 (懒加载, 瀑布流, 图片灯箱)。
     */
    function initPlugins() {
        // 1. 初始化图片懒加载
        var lazyLoadInstance = new LazyLoad({
            elements_selector: ".lazyload"
        });

        // 2. 初始化瀑布流布局
        var grids = document.querySelectorAll('.img-box-ul');
        grids.forEach(function(grid) {
            // 使用 imagesLoaded 库来确保所有图片加载完成，获得真实高度后，再应用布局
            var imgLoad = imagesLoaded(grid);
            
            imgLoad.on('always', function() {
                // 所有图片都处理完毕后（无论成功或失败），初始化 Masonry
                new Masonry(grid, {
                    itemSelector: '.thumb',
                    columnWidth: '.thumb',
                    gutter: 0, 
                    percentPosition: true,
                    fitWidth: true,
                    transitionDuration: '0.4s'
                });
            });
        });

        // 3. 初始化 PhotoSwipe 灯箱效果
        initPhotoSwipeFromDOM('.photos');
    }

    /**
     * 一个轻量级的、基于 IntersectionObserver 的图片懒加载库。
     */
    function LazyLoad(options) {
        var settings = Object.assign({ elements_selector: ".lazyload", threshold: 0, rootMargin: "200px" }, options);
        var images = document.querySelectorAll(settings.elements_selector);
        var observer = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    var src = img.getAttribute('data-src');
                    if (src) {
                        img.src = src;
                        img.classList.add('lazyloaded'); 
                    }
                    observer.unobserve(img);
                }
            });
        }, settings);
        images.forEach(function(image) { observer.observe(image); });
    }
    
    /**
     * PhotoSwipe 的初始化函数 (从官方Demo脚本中提取并简化)
     */
    function initPhotoSwipeFromDOM(gallerySelector) {
        var parseThumbnailElements = function(el) {
            var thumbElements = el.querySelectorAll('.thumb'),
                numNodes = thumbElements.length,
                items = [],
                figureEl, linkEl, size, item;
            for (var i = 0; i < numNodes; i++) {
                figureEl = thumbElements[i];
                if (figureEl.nodeType !== 1) continue;
                linkEl = figureEl.children[0];
                size = linkEl.getAttribute('data-size').split('x');
                item = {
                    src: linkEl.getAttribute('href'),
                    w: parseInt(size[0], 10),
                    h: parseInt(size[1], 10)
                };
                if (figureEl.children.length > 1) {
                    item.title = figureEl.children[1].innerHTML;
                }
                if (linkEl.children.length > 0) {
                    item.msrc = linkEl.children[0].getAttribute('src');
                }
                item.el = figureEl;
                items.push(item);
            }
            return items;
        };

        var closest = function closest(el, fn) {
            return el && (fn(el) ? el : closest(el.parentNode, fn));
        };

        var onThumbnailsClick = function(e) {
            e = e || window.event;
            e.preventDefault ? e.preventDefault() : e.returnValue = false;
            var eTarget = e.target || e.srcElement;
            var clickedListItem = closest(eTarget, function(el) {
                return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
            });
            if (!clickedListItem) return;
            var clickedGallery = clickedListItem.closest('.photos');
            var childNodes = Array.from(clickedListItem.parentNode.children);
            var index = childNodes.indexOf(clickedListItem);
            if (index >= 0) {
                var pswpElement = document.querySelectorAll('.pswp')[0];
                if(pswpElement) openPhotoSwipe(index, clickedGallery, false, false, pswpElement);
            }
            return false;
        };
        
        var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL, pswpElement) {
            var gallery, options, items;
            items = parseThumbnailElements(galleryElement);
            options = {
                galleryUID: galleryElement.getAttribute('data-pswp-uid') || new Date().getTime(),
                getThumbBoundsFn: function(index) {
                    var thumbnail = items[index].el.getElementsByTagName('img')[0],
                        pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
                        rect = thumbnail.getBoundingClientRect();
                    return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
                },
                index: parseInt(index, 10),
                showAnimationDuration: disableAnimation ? 0 : 250
            };
            if (isNaN(options.index)) return;
            gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
            gallery.init();
        };

        var galleryElements = document.querySelectorAll(gallerySelector);
        for (var i = 0, l = galleryElements.length; i < l; i++) {
            galleryElements[i].setAttribute('data-pswp-uid', i + 1);
            galleryElements[i].onclick = onThumbnailsClick;
        }
    };

    /**
     * 智能启动器：等待所有依赖库加载完成后再执行主程序
     */
    function runApp() {
        // 需要检查的依赖库
        var dependencies = ['Masonry', 'imagesLoaded', 'PhotoSwipe', 'PhotoSwipeUI_Default'];
        
        var checkDependencies = function() {
            var missing = dependencies.filter(function(dep) { return typeof window[dep] === 'undefined'; });
            if (missing.length === 0) {
                // 所有依赖都已加载，启动主程序
                if (document.querySelector('.instagram')) {
                    loadPhotoData(renderGallery);
                }
            } else {
                // 仍有依赖未加载，100毫秒后再次检查
                console.log('等待依赖库:', missing.join(', '));
                setTimeout(checkDependencies, 100);
            }
        };

        checkDependencies();
    }

    // --- 启动应用 ---
    // 使用 DOMContentLoaded 确保基本DOM树已构建完成
    document.addEventListener('DOMContentLoaded', runApp);

})();
