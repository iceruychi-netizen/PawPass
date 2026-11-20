/** Tailwind CSS cho các trang giới thiệu của PawPass (public/gioi-thieu.html, public/lien-he.html).
 *  Ứng dụng chính (public/index.html) dùng CSS riêng ở public/css/app.css từ prototype Step 1,
 *  nên Tailwind chỉ quét các trang mới để hai bộ CSS không đè lên nhau.
 *  Build: npm run build:css  →  public/css/tailwind.css */
module.exports = {
  content: ['./public/gioi-thieu.html', './public/lien-he.html', './public/js/site.js'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF1DF',      // nền chính, giống app
        paper: '#FFFCF5',      // nền thẻ
        ink: '#3A2E28',        // chữ và viền
        muted: '#7A6352',
        orange: { DEFAULT: '#F2A541', dark: '#E58E2E', text: '#A85A14' },
        mint: '#7BD389',
        sky: '#7FB8F0',
        rose: '#F7B9C6'
      },
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        hand: ['"Patrick Hand"', 'cursive']
      },
      boxShadow: {
        chunky: '0 4px 0 #3A2E28',     // bóng "nút gỗ" giống app
        'chunky-sm': '0 3px 0 #3A2E28'
      },
      borderWidth: { 2.5: '2.5px' }
    }
  },
  plugins: []
};
