/**
 * ===================================================================
 * ins.js - 相册功能重构版
 * v4.0: 移除了所有依赖检查和动态加载，简化了代码结构
 * ===================================================================
 */

(function() {
    'use strict';

    /**
     * 从 JSON 文件异步获取照片数据。
     * @param {string} url - JSON 文件的路径。
     * @param {function(object): void} successCallback - 成功回调。
     * @param {function(string): void} errorCallback - 失败回调。
     */
    function loadPhotoData(url, successCallback, errorCallback) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应失败，状态码：' + response.status);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.list && data.list.length > 0) {
                    successCallback(data);
                } else {
                    throw new Error('照片数据为空或格式不正确。');
                }
            })
            .catch(error => {
                errorCallback(error.message);
            });
    }

    /**
     * 将整个照片画廊渲染到DOM中。
     * @param {HTMLElement} container - 用于容纳画廊的DOM元素。
     * @param {object} data - 从 data.json 加载的照片数据。
     */
    function renderGallery(container, data) {
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
                const paddingTop = (minHeight / minWidth) * 100;

                return `
                    <figure class="grid-item thumb" itemprop="associatedMedia" itemscope itemtype="http://schema.org/ImageObject">
                        <a href="${src}" itemprop="contentUrl" data-size="${imageSize}">
                            <div class="aspect-ratio-box" style="padding-top: ${paddingTop.toFixed(4)}%;">
                                <img src="${minSrc}" itemprop="thumbnail" alt="${caption}">
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

        container.innerHTML = finalHtml;
    }
    
    /**
     * 初始化瀑布流布局插件 (Masonry)。
     * @param {string} gridSelector - 瀑布流网格容器的选择器。
     */
    function initMasonry(gridSelector) {
        var grid = document.querySelector(gridSelector);
        if (grid && typeof Masonry !== 'undefined') {
            new Masonry(grid, {
                itemSelector: '.grid-item',
                columnWidth: '.thumb',
                gutter: 0,
                percentPosition: true,
                fitWidth: true,
                transitionDuration: '0.4s'
            });
        }
    }

    /**
     * 初始化 PhotoSwipe 灯箱。
     * @param {string} gallerySelector - 画廊容器的选择器。
     */
    function initPhotoSwipe(gallerySelector) {
        var pswpElement = document.querySelectorAll('.pswp')[0];
        if (!pswpElement || typeof PhotoSwipe === 'undefined') return;

        var gallery = document.querySelector(gallerySelector);
        if (!gallery) return;

        var items = [];

        var onThumbnailsClick = function(e) {
            e.preventDefault();
            
            var clickedListItem = e.target.closest('.thumb');
            if (!clickedListItem) return;

            var allThumbs = Array.from(gallery.querySelectorAll('.thumb'));
            var index = allThumbs.indexOf(clickedListItem);

            if (index >= 0) {
                // 仅在第一次打开时解析所有DOM元素
                if (items.length === 0) {
                    allThumbs.forEach(thumb => {
                        var link = thumb.querySelector('a');
                        var img = thumb.querySelector('img');
                        var size = link.getAttribute('data-size').split('x');
                        items.push({
                            src: link.getAttribute('href'),
                            w: parseInt(size[0], 10),
                            h: parseInt(size[1], 10),
                            el: thumb,
                            msrc: img.getAttribute('src')
                        });
                    });
                }
                
                var options = {
                    index: index,
                    galleryUID: gallery.getAttribute('data-pswp-uid') || new Date().getTime(),
                    getThumbBoundsFn: function(index) {
                        var thumbnail = items[index].el.querySelector('img');
                        var rect = thumbnail.getBoundingClientRect();
                        return { x: rect.left, y: rect.top + window.pageYOffset, w: rect.width };
                    }
                };
                
                var lightbox = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
                lightbox.init();
            }
        };
        
        gallery.addEventListener('click', onThumbnailsClick);
    }

    /**
     * 主函数：启动整个相册应用
     */
    function main() {
        var container = document.querySelector('.instagram');
        if (!container) return;
        
        var loadingIndicator = container.querySelector('.open-ins');

        loadPhotoData(
            '../lib/album/data.json?t=' + new Date().getTime(),
            // 成功回调
            function(data) {
                renderGallery(container, data);
                initMasonry('.img-box-ul');
                initPhotoSwipe('.photos');
            },
            // 失败回调
            function(errorMessage) {
                if (loadingIndicator) {
                    loadingIndicator.textContent = '图片加载失败: ' + errorMessage;
                }
                console.error(errorMessage);
            }
        );
    }

    // 当DOM加载完毕后，立即执行主函数
    document.addEventListener('DOMContentLoaded', main);

})();