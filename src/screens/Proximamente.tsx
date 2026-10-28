import { TopBar } from '../ui/kit';
import { Icon } from '../ui/Icon';

export function Proximamente({ titulo, fase, texto, tab }: { titulo: string; fase: string; texto: string; tab?: boolean }) {
  return (
    <>
      <TopBar titulo={titulo} atras={!tab} />
      <div className="scroll">
        <div className="empty" style={{ paddingTop: 70 }}>
          <div className="iconbtn" style={{ margin: '0 auto 16px', width: 64, height: 64, borderRadius: 20 }}><Icon name="lock" /></div>
          <div className="mid">Próximamente · {fase}</div>
          <p style={{ marginTop: 8 }}>{texto}</p>
        </div>
      </div>
    </>
  );
}
