/**
 * ===================================================================
 * ins.js - 相册功能重构版
 * v3.1: 修复了 PhotoSwipe 点击事件，使其能正确解析新的HTML结构
 * ===================================================================
 */

(function() {
    'use strict';

    /**
     * 从 JSON 文件异步获取照片数据。
     * @param {function(object): void} callback 数据加载成功后的回调函数。
     */
    function loadPhotoData(callback) {
        var dataUrl = '../lib/album/data.json?t=' + new Date().getTime();
        fetch(dataUrl)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok.');
                return response.json();
            })
            .then(data => {
                if (data && data.list && data.list.length > 0) {
                    callback(data);
                } else {
                    console.error('Error: Loaded data is empty or malformed.');
                }
            })
            .catch(error => console.error('Error fetching or parsing photo data:', error));
    }

    /**
     * 将整个照片画廊渲染到DOM中。
     * @param {object} data 从 data.json 加载的照片数据。
     */
    function renderGallery(data) {
        var instagramContainer = document.querySelector('.instagram');
        if (!instagramContainer) {
            console.error('Error: Main container ".instagram" not found.');
            return;
        }

        var allItemsHtml = data.list.reduce((accumulator, monthlyData) => {
            const { arr: photoData } = monthlyData;
            
            const titleHtml = `
                <div class="grid-item grid-item--title">
                    <h1 class="year">${photoData.year}年<em>${photoData.month}月</em></h1>
                </div>`;
            
            const photosHtml = photoData.link.map((link, i) => {
                const minSrc = `https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/min_photos/${link}`;
                const src = `https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/photos/${link}`;
                
                const imageSize = photoData.size?.[i] || '1080x1080';
                const minImageSize = photoData.min_size?.[i] || '1x1';
                const caption = photoData.text?.[i] || '';

                const [minWidth, minHeight] = minImageSize.split('x').map(Number);
                const aspectRatio = (minHeight / minWidth) * 100;

                return `
                    <figure class="grid-item thumb" itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">
                        <a href="${src}" itemprop="contentUrl" data-size="${imageSize}">
                            <div class="aspect-ratio-box" style="padding-top: ${aspectRatio.toFixed(4)}%;">
                                <img class="lazyload" 
                                     src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
                                     data-src="${minSrc}" 
                                     itemprop="thumbnail" 
                                     alt="${caption}">
                            </div>
                        </a>
                    </figure>`;
            }).join('');

            return accumulator + titleHtml + photosHtml;
        }, '');

        const finalHtml = `
            <div class="photos" itemscope itemtype="http://schema.org/ImageGallery">
                <div class="img-box-ul">${allItemsHtml}</div>
            </div>`;

        instagramContainer.innerHTML = finalHtml;
        initPlugins();
    }

    /**
     * 初始化所有必需的插件 (懒加载, 瀑布流, 图片灯箱)。
     */
    function initPlugins() {
        var lazyLoadInstance = new LazyLoad({
            elements_selector: ".lazyload"
        });

        var grid = document.querySelector('.img-box-ul');
        if (grid) {
            new Masonry(grid, {
                itemSelector: '.grid-item',
                columnWidth: '.thumb',
                gutter: 0,
                percentPosition: true,
                fitWidth: true,
                transitionDuration: '0.4s'
            });
        }

        initPhotoSwipeFromDOM('.photos');
    }
    
    /**
     * 一个轻量级的、基于 IntersectionObserver 的图片懒加载库。
     */
    function LazyLoad(options){var settings=Object.assign({elements_selector:".lazyload",threshold:0,rootMargin:"200px"},options);var images=document.querySelectorAll(settings.elements_selector);var observer=new IntersectionObserver(function(entries,observer){entries.forEach(function(entry){if(entry.isIntersecting){var img=entry.target;var src=img.getAttribute('data-src');if(src){img.src=src;img.classList.add('lazyloaded')}observer.unobserve(img)}})},settings);images.forEach(function(image){observer.observe(image)})}

    /**
 * PhotoSwipe 的初始化函数 (从官方Demo脚本中提取并简化)
 * **此函数已修复**
 */
function initPhotoSwipeFromDOM(gallerySelector) {
    // 解析来自DOM的缩略图元素
    var parseThumbnailElements = function(el) {
        var thumbElements = el.querySelectorAll('.thumb'),
            numNodes = thumbElements.length,
            items = [],
            figureEl, linkEl, imgEl, size, item;

        for (var i = 0; i < numNodes; i++) {
            figureEl = thumbElements[i];
            if (figureEl.nodeType !== 1) continue;

            linkEl = figureEl.querySelector('a');
            imgEl = figureEl.querySelector('img');

            if (!linkEl || !imgEl) continue;

            size = linkEl.getAttribute('data-size').split('x');

            item = {
                src: linkEl.getAttribute('href'),
                w: parseInt(size[0], 10),
                h: parseInt(size[1], 10)
            };

            item.msrc = imgEl.getAttribute('data-src') || imgEl.src;
            item.el = figureEl; 
            items.push(item);
        }
        return items;
    };

    // 查找最近的父元素
    var closest = function closest(el, fn) {
        return el && (fn(el) ? el : closest(el.parentNode, fn));
    };

    // 点击缩略图时的处理函数
    var onThumbnailsClick = function(e) {
        e = e || window.event;
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
        var eTarget = e.target || e.srcElement;

        // 查找被点击的 <figure> 元素
        var clickedListItem = closest(eTarget, function(el) {
            return (el.tagName && el.tagName.toUpperCase() === 'FIGURE');
        });
        if (!clickedListItem) return;
        
        // **修复核心**：
        // 1. 'this' 指向被绑定事件的画廊元素 ('.photos')，无需再次查找。
        // 2. 使用更可靠的循环来查找索引，替代 Array.from 和 indexOf。
        var gallery = this;
        var thumbs = gallery.querySelectorAll('.thumb');
        var index = -1;
        for (var i = 0; i < thumbs.length; i++) {
            if (thumbs[i] === clickedListItem) {
                index = i;
                break;
            }
        }

        if (index >= 0) {
            var pswpElement = document.querySelectorAll('.pswp')[0];
            if (pswpElement) openPhotoSwipe(index, gallery, false, false, pswpElement);
        }
        return false;
    };

    var openPhotoSwipe = function(index, galleryElement, disableAnimation, fromURL, pswpElement) {
        var gallery, options, items;
        items = parseThumbnailElements(galleryElement);
        options = {
            galleryUID: galleryElement.getAttribute('data-pswp-uid') || new Date().getTime(),
            getThumbBoundsFn: function(index) {
                var thumbnail = items[index].el.querySelector('img'),
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

    // 绑定点击事件
    var galleryElements = document.querySelectorAll(gallerySelector);
    for (var i = 0, l = galleryElements.length; i < l; i++) {
        galleryElements[i].setAttribute('data-pswp-uid', i + 1);
        // **修复核心**：直接将 onThumbnailsClick 赋值给 onclick。
        // 在事件触发时，函数内部的 'this' 会自动指向 galleryElements[i]。
        galleryElements[i].onclick = onThumbnailsClick;
    }
};

    /**
     * 智能启动器：等待所有依赖库加载完成后再执行主程序
     */
    function runApp() {
        var dependencies = ['Masonry', 'PhotoSwipe', 'PhotoSwipeUI_Default'];
        
        function checkDependencies() {
            const missing = dependencies.filter(dep => typeof window[dep] === 'undefined');
            if (missing.length === 0) {
                if (document.querySelector('.instagram')) {
                    loadPhotoData(renderGallery);
                }
            } else {
                console.log('Waiting for dependencies:', missing.join(', '));
                setTimeout(checkDependencies, 100);
            }
        }
        checkDependencies();
    }

    // --- 启动应用 ---
    document.addEventListener('DOMContentLoaded', runApp);
})();
