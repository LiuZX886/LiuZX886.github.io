/**
 * ===================================================================
 * ins.js - Photo Album Script (Final Version)
 * Assumes Masonry and PhotoSwipe libraries are already loaded.
 * ===================================================================
 */
(function() {
    'use strict';

    // 主函数，初始化画廊
    function initGallery() {
        var galleryContainer = document.querySelector('.instagram');
        if (!galleryContainer) {
            console.error('Gallery container ".instagram" not found.');
            return;
        }

        var loadingIndicator = galleryContainer.querySelector('.open-ins');

        // 从JSON文件获取照片数据
        fetch('../lib/album/data.json?t=' + new Date().getTime())
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (!data || !data.list || data.list.length === 0) {
                    throw new Error('Photo data is empty or invalid.');
                }
                // 渲染画廊
                renderHTML(galleryContainer, data);
                // 初始化插件
                setupPlugins();
            })
            .catch(function(error) {
                console.error('Failed to load or process photo data:', error);
                if (loadingIndicator) {
                    loadingIndicator.textContent = '图片加载失败，请刷新页面重试。';
                }
            });
    }

    // 构建并注入画廊的HTML
    function renderHTML(container, data) {
        var allItemsHtml = data.list.reduce(function(accumulator, monthlyData) {
            var photoData = monthlyData.arr;
            var titleHtml = `
                <div class="grid-item grid-item--title">
                    <h1 class="year">${photoData.year}年<em>${photoData.month}月</em></h1>
                </div>`;

            var photosHtml = photoData.link.map(function(link, i) {
                var minSrc = 'https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/min_photos/' + link;
                var src = 'https://raw.githubusercontent.com/LiuZX886/MyAlbum/master/photos/' + link;
                var imageSize = photoData.size?.[i] || '1080x1080';
                var caption = photoData.text?.[i] || '';

                 // 1. 恢复：根据min_size计算宽高比，用于CSS占位
                var minImageSize = photoData.min_size?.[i] || '1x1';
                var [minWidth, minHeight] = minImageSize.split('x').map(Number);
                var paddingTop = (minHeight / minWidth) * 100;

                // 2. 恢复：使用 aspect-ratio-box 包裹 img 标签
                // 注意：img 的 src 现在是直接加载，而不是懒加载。您的 ins.css 应该将它 position: absolute。
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

        var finalHtml = `
            <div class="photos" itemscope itemtype="http://schema.org/ImageGallery">
                <div class="img-box-ul">${allItemsHtml}</div>
            </div>`;
        container.innerHTML = finalHtml;
    }

    // 初始化 Masonry 和 PhotoSwipe
    // 初始化 Masonry 和 PhotoSwipe
function setupPlugins() {
    var grid = document.querySelector('.img-box-ul');
    if (grid) {
        // 直接初始化 Masonry，不再需要等待图片加载
        new Masonry(grid, {
            itemSelector: '.grid-item',
            columnWidth: '.thumb',
            gutter: 0,
            percentPosition: true
        });
    }

    initPhotoSwipeFromDOM('.photos');
}

    // PhotoSwipe 标准初始化函数
    function initPhotoSwipeFromDOM(gallerySelector) {
        var pswpElement = document.querySelectorAll('.pswp')[0];
        var galleryElement = document.querySelector(gallerySelector);

        if (!pswpElement || !galleryElement) {
            return;
        }

        var onThumbnailsClick = function(e) {
            e.preventDefault();

            var clickedListItem = e.target.closest('figure.thumb');
            if (!clickedListItem) {
                return;
            }

            var allThumbs = Array.from(galleryElement.querySelectorAll('figure.thumb'));
            var index = allThumbs.indexOf(clickedListItem);

            if (index < 0) {
                return;
            }

            var items = allThumbs.map(function(figure) {
                var link = figure.querySelector('a');
                var size = link.getAttribute('data-size').split('x');
                return {
                    src: link.getAttribute('href'),
                    w: parseInt(size[0], 10),
                    h: parseInt(size[1], 10),
                    el: figure
                };
            });

            var options = {
                index: index,
                getThumbBoundsFn: function(index) {
                    var thumbnail = items[index].el.querySelector('img');
                    var pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
                    var rect = thumbnail.getBoundingClientRect();
                    return { x: rect.left, y: rect.top + pageYScroll, w: rect.width };
                }
            };

            var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
            gallery.init();
        };

        galleryElement.addEventListener('click', onThumbnailsClick);
    }

    // 当DOM加载完毕后，立即执行主函数
    document.addEventListener('DOMContentLoaded', initGallery);
})();