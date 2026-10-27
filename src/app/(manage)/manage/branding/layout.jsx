// Branding: meniul capitolelor în stânga, capitolul curent în dreapta. Montserrat e fontul brandului (pagina 9).
import {Montserrat} from 'next/font/google';
import {SECTIUNI, BRANDBOOK} from '../../../../manage/brand.mjs';
import BrandNav from '../../../../manage/ui/BrandNav.jsx';
import '../../../../manage/brand.css';

const montserrat = Montserrat({subsets: ['latin', 'latin-ext'], weight: ['300', '400', '600', '700'], variable: '--font-montserrat', display: 'swap'});

export default function BrandingLayout({children}) {
  return (
    <div className={montserrat.variable}>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a> › identitate</div><h1>Branding</h1></div></div>
      <p className="bb-src">Din brandbook-ul „{BRANDBOOK.fisier}” · {BRANDBOOK.pagini} de pagini</p>
      <div className="bb">
        <BrandNav sections={SECTIUNI}/>
        <div className="bb-main">{children}</div>
      </div>
    </div>
  );
}
