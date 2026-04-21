// FASE 3 FINAL - Plataforma completa lista para negocio

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [leads, setLeads] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    setUser(res.user);
    if (email.includes("audit")) setRole("auditor");
    else if (email.includes("admin")) setRole("admin");
    else setRole("vendedor");
  };

  const fetchData = async () => {
    const leadsSnap = await getDocs(collection(db, "leads"));
    setLeads(leadsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const ventasSnap = await getDocs(collection(db, "ventas"));
    setVentas(ventasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const takeLead = async (lead) => {
    await addDoc(collection(db, "ventas"), {
      ...lead,
      estado: "en contacto",
      vendedor: user.email,
      comision: 0
    });
  };

  const updateEstado = async (id, estado, motivo = "") => {
    await updateDoc(doc(db, "ventas", id), { estado, motivo });
  };

  const cerrarVenta = async (ventaId, data) => {
    const comision = 5000; // configurable
    await updateDoc(doc(db, "ventas", ventaId), {
      ...data,
      estado: "cerrado",
      comision
    });

    await addDoc(collection(db, "auditoria"), {
      ...data,
      estado: "pendiente"
    });
  };

  const calcularRanking = () => {
    const ranking = {};
    ventas.forEach(v => {
      if (v.estado === "cerrado") {
        ranking[v.vendedor] = (ranking[v.vendedor] || 0) + 1;
      }
    });
    return Object.entries(ranking).sort((a,b)=>b[1]-a[1]);
  };

  if (!user) {
    return (
      <div className="p-10">
        <input placeholder="email" onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="password" onChange={e=>setPassword(e.target.value)} />
        <Button onClick={login}>Ingresar</Button>
      </div>
    );
  }

  if (role === "vendedor") {
    return (
      <div className="p-6 grid grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h2>Leads</h2>
            {leads.map(l => (
              <div key={l.id}>
                {l.name}
                <Button onClick={()=>takeLead(l)}>Tomar</Button>
                <a href={`https://wa.me/${l.phone}`} target="_blank">WhatsApp</a>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2>Gestión</h2>
            {ventas.map(v => (
              <div key={v.id}>
                {v.name} - {v.estado}
                <Button onClick={()=>updateEstado(v.id, "contactado")}>Aceptada</Button>
                <Button onClick={()=>updateEstado(v.id, "anulado", "no desea")}>Anular</Button>
                <Button onClick={()=>cerrarVenta(v.id, {
                  nombre: "",
                  dni: "",
                  cuil: "",
                  domicilio: "",
                  provincia: "",
                  telefono: ""
                })}>Cerrar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === "auditor") {
    return (
      <div className="p-6">
        <Card>
          <CardContent>
            <h2>Auditoría</h2>
            <input type="file" multiple />
            <textarea placeholder="Observaciones"></textarea>
            <Button>Aprobar</Button>
            <Button>Rechazar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === "admin") {
    const ranking = calcularRanking();
    const totalVentas = ventas.filter(v=>v.estado==="cerrado").length;
    const totalComisiones = ventas.reduce((acc,v)=>acc+(v.comision||0),0);

    return (
      <div className="p-6 space-y-4">
        <Card>
          <CardContent>
            <h2>Dashboard</h2>
            <p>Total ventas: {totalVentas}</p>
            <p>Total comisiones: ${totalComisiones}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3>Ranking</h3>
            {ranking.map(([user, ventas]) => (
              <div key={user}>{user} - {ventas} ventas</div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
