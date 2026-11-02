import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function App() {
  // Estados de Autenticación y Perfil
  const [session, setSession] = useState(null)
  const [vendedoraPerfil, setVendedoraPerfil] = useState(null)
  const [authView, setAuthView] = useState('login') // 'login' | 'register' | 'forgot'
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Register states
  const [regNombre, setRegNombre] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPlan, setRegPlan] = useState('Mensual ($50 MXN)')

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('')

  // Estados Generales y Catálogos
  const [productos, setProductos] = useState([])
  const [tiposNegocio, setTiposNegocio] = useState([])
  const [competencia, setCompetencia] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [compSearch, setCompSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentView, setCurrentView] = useState('catalogo')
  const [selectedNegocio, setSelectedNegocio] = useState(null)
  const [selectedArea, setSelectedArea] = useState(null)
  const [selectedFamilia, setSelectedFamilia] = useState(null)
  const [modalItem, setModalItem] = useState(null)
  
  // Carrito y Selección de Cliente
  const [cart, setCart] = useState([])
  const [selectedClienteId, setSelectedClienteId] = useState('')

  // Modal de Nuevo / Editar Cliente
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [editingClienteId, setEditingClienteId] = useState(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoCorreo, setNuevoCorreo] = useState('')
  const [nuevoTipoNegocio, setNuevoTipoNegocio] = useState('REST')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchVendedoraData(session.user.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchVendedoraData(session.user.email)
      else {
        setVendedoraPerfil(null)
        setProfileLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && vendedoraPerfil) {
      const estatusCrudo = vendedoraPerfil?.estatus_suscripcion || vendedoraPerfil?.estatus || vendedoraPerfil?.Estatus_Suscripcion || vendedoraPerfil?.Estatus || 'EN REVISIÓN';
      const estatusSuscripcion = String(estatusCrudo).trim().toUpperCase();
      if (estatusSuscripcion === 'ACTIVO') {
        fetchAppData();
      }
    }
  }, [session, vendedoraPerfil])

  async function fetchVendedoraData(email) {
    try {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('vendedoras_usuarios')
        .select('*')
        .eq('correo_electronico', email)
        .single()

      if (error) throw error
      setVendedoraPerfil(data)
    } catch (error) {
      console.error('Error obteniendo perfil de vendedora:', error.message)
      setVendedoraPerfil(null)
    } finally {
      setProfileLoading(false)
    }
  }

  async function fetchAppData() {
    try {
      setLoading(true)
      const { data: prodData } = await supabase.from('productos_ecolosia').select('*')
      setProductos(prodData || [])

      const { data: negData } = await supabase.from('tipos_negocio').select('*')
      setTiposNegocio(negData || [])

      const { data: compData } = await supabase.from('competencia').select('*')
      setCompetencia(compData || [])

      let cliQuery = supabase.from('clientes').select('*')
      if (vendedoraPerfil?.id_vendedora || vendedoraPerfil?.ID_Vendedora) {
        cliQuery = cliQuery.eq('id_vendedora', vendedoraPerfil.id_vendedora || vendedoraPerfil.ID_Vendedora)
      }
      const { data: cliData } = await cliQuery
      setClientes(cliData || [])

    } catch (error) {
      console.error('Error cargando datos de Supabase:', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
    } catch (error) {
      alert('Error al iniciar sesión: ' + error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!regNombre || !regEmail || !regPhone || !regPassword) {
      alert('Por favor completa todos los campos obligatorios.')
      return
    }

    setAuthLoading(true)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      })
      if (authError) throw authError

      const nuevoIdVen = `VEN-${Date.now()}`
      const { error: dbError } = await supabase.from('vendedoras_usuarios').insert([{
        id_vendedora: nuevoIdVen,
        nombre_completo: regNombre,
        telefono_celular: regPhone,
        correo_electronico: regEmail,
        estatus_suscripcion: 'EN REVISIÓN',
        plan_contratado: regPlan,
        fecha_ultimo_pago: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
      }])

      if (dbError) throw dbError

      alert('¡Registro exitoso! Por favor inicia sesión con tu correo y contraseña.')
      setAuthView('login')
    } catch (error) {
      console.error('Error en registro:', error.message)
      alert('Error al registrar cuenta: ' + error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!forgotEmail) {
      alert('Por favor ingresa tu correo electrónico.')
      return
    }

    setAuthLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      alert('¡Correo enviado! Revisa tu bandeja de entrada para restablecer tu contraseña.')
      setAuthView('login')
    } catch (error) {
      console.error('Error al recuperar contraseña:', error.message)
      alert('Error al enviar correo de recuperación: ' + error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setVendedoraPerfil(null)
    setCart([])
  }

  const areasAccion = [
    { id: 'Cocina', nombre: 'Cocinas y Áreas de Cocción', icono: '🍳', desc: 'Desengrasantes, planchas, campanas y eliminación de cochambre.' },
    { id: 'Baños', nombre: 'Baños y Sanitarios', icono: '🚽', desc: 'Quitazarro, grifería, canceles y desinfección profunda.' },
    { id: 'Pisos', nombre: 'Pisos y Pasillos', icono: '🧹', desc: 'Limpiadores multiusos para cerámica, loseta y concreto.' },
    { id: 'Cristales', nombre: 'Cristales y Superficies', icono: '🪟', desc: 'Claridad sin vetas en ventanales, espejos y exhibidores.' }
  ]

  const negocioActual = tiposNegocio.find(
    (neg) => (neg.id_tipo_negocio || neg.ID_Tipo_Negocio) === selectedNegocio
  )
  const nombreNegocioActual = negocioActual ? (negocioActual.nombre_negocio || negocioActual.Nombre_Negocio) : ''
  const iconoNegocioActual = negocioActual ? (negocioActual.icono_ui || neg.Icono_UI || '🏢') : '🏢'

  const addToCart = (prod) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => (item.id_producto || item.ID_Producto) === (prod.id_producto || prod.ID_Producto));
      if (existingItem) {
        return prevCart.map(item => 
          (item.id_producto || item.ID_Producto) === (prod.id_producto || prod.ID_Producto)
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...prod, cantidad: 1 }];
      }
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        const itemId = item.id_producto || item.ID_Producto;
        if (itemId === id) {
          const nuevaCantidad = item.cantidad + delta;
          return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalInversion = cart.reduce((sum, item) => {
    const precio = item.precio_galon || item.Precio_Galon || 0;
    return sum + (precio * item.cantidad);
  }, 0);
  const totalBotellasEvitadas = cart.reduce((sum, item) => {
    const rendimiento = item.rendimiento_litros_preparados || item.Rendimiento_Litros_Preparados || 40;
    return sum + (rendimiento * item.cantidad);
  }, 0);

  const clienteSeleccionado = clientes.find(
    c => String(c.id_cliente || c.ID_Cliente) === String(selectedClienteId)
  ) || clientes[0];

  const vendedoraAsignada = vendedoraPerfil || { 
    nombre_completo: 'Asesor Ecolosía', 
    telefono_celular: '4492286585', 
    correo_electronico: session?.user?.email || '' 
  };

  const abrirModalNuevo = () => {
    setEditingClienteId(null);
    setNuevoNombre('');
    setNuevoTelefono('');
    setNuevoCorreo('');
    setNuevoTipoNegocio('REST');
    setShowClienteModal(true);
  };

  const abrirModalEditar = (cli) => {
    setEditingClienteId(cli.id_cliente || cli.ID_Cliente);
    setNuevoNombre(cli.nombre_cliente_empresa || cli.Nombre_Cliente_Empresa || '');
    setNuevoTelefono(cli.telefono_whatsapp || cli.Telefono_WhatsApp || '');
    setNuevoCorreo(cli.correo_electronico || cli.Correo_Electronico || '');
    setNuevoTipoNegocio(cli.id_tipo_negocio || cli.ID_Tipo_Negocio || 'REST');
    setShowClienteModal(true);
  };

  async function handleGuardarCliente(e) {
    e.preventDefault();
    if (!nuevoNombre || !nuevoTelefono) {
      alert('Por favor ingresa al menos el Nombre y el WhatsApp del cliente.');
      return;
    }

    try {
      const idVendedorActual = vendedoraPerfil?.id_vendedora || vendedoraPerfil?.ID_Vendedora || null;

      if (editingClienteId) {
        const clienteActualizado = {
          nombre_cliente_empresa: nuevoNombre,
          telefono_whatsapp: nuevoTelefono,
          correo_electronico: nuevoCorreo || 'sin-correo@ecolosia.com',
          id_tipo_negocio: nuevoTipoNegocio
        };

        const { error } = await supabase
          .from('clientes')
          .update(clienteActualizado)
          .eq('id_cliente', editingClienteId);

        if (error) throw error;

        setClientes(prev => prev.map(c => 
          String(c.id_cliente || c.ID_Cliente) === String(editingClienteId)
            ? { ...c, ...clienteActualizado }
            : c
        ));
      } else {
        const nuevoId = `CLI-${Date.now()}`;
        const nuevoClienteObj = {
          id_cliente: nuevoId,
          id_vendedora: idVendedorActual,
          nombre_cliente_empresa: nuevoNombre,
          telefono_whatsapp: nuevoTelefono,
          correo_electronico: nuevoCorreo || 'sin-correo@ecolosia.com',
          id_tipo_negocio: nuevoTipoNegocio
        };

        const { error } = await supabase.from('clientes').insert([nuevoClienteObj]);
        if (error) throw error;

        setClientes(prev => [...prev, nuevoClienteObj]);
        setSelectedClienteId(nuevoId);
      }

      setNuevoNombre('');
      setNuevoTelefono('');
      setNuevoCorreo('');
      setEditingClienteId(null);
      setShowClienteModal(false);
    } catch (error) {
      console.error('Error al guardar cliente:', error.message);
      alert('Hubo un error al guardar el cliente: ' + error.message);
    }
  }

  const handleEnviarWhatsApp = () => {
    const telefonoCliente = clienteSeleccionado?.telefono_whatsapp || clienteSeleccionado?.Telefono_WhatsApp || '';
    const telefonoLimpio = telefonoCliente.replace(/\D/g, '');

    if (!telefonoLimpio) {
      alert('⚠️ El cliente seleccionado no tiene un número de WhatsApp válido registrado.');
      return;
    }

    let mensaje = `🌱 *PROPUESTA COMERCIAL - ECOLOSÍA*\n\n`;
    mensaje += `Hola *${clienteSeleccionado?.nombre_cliente_empresa || clienteSeleccionado?.Nombre_Cliente_Empresa || 'Cliente'}*, te comparto la cotización solicitada:\n\n`;

    cart.forEach((item) => {
      const nombre = item.nombre_producto || item.Nombre_Producto || 'Producto';
      const precio = item.precio_galon || item.Precio_Galon || 0;
      const subtotal = precio * item.cantidad;
      const dilucion = item.dilucion_recomendada || item.Dilucion_Recomendada || 'N/D';
      const rendimiento = item.rendimiento_litros_preparados || item.Rendimiento_Litros_Preparados || 40;
      mensaje += `• *${item.cantidad}x* ${nombre} — $${subtotal} MXN\n  (Dilución: ${dilucion} | Rinde: ${rendimiento}L prep.)\n`;
    });

    mensaje += `\n💰 *Inversión Total:* $${totalInversion} MXN`;
    mensaje += `\n♻️ *Impacto Ecológico:* ${totalBotellasEvitadas} botellas de 1L evitadas al planeta.\n\n`;
    mensaje += `Atentamente,\n👤 *Asesor:* ${vendedoraAsignada.nombre_completo || vendedoraAsignada.Nombre_Completo}\n📞 *Celular:* ${vendedoraAsignada.telefono_celular || vendedoraAsignada.Telefono_Celular}`;

    const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  const productosFiltrados = productos.filter((prod) => {
    const nombre = prod.nombre_producto || prod.Nombre_Producto || ''
    const tags = prod.tags_busqueda || prod.Tags_Busqueda || ''
    const idsNegocios = prod.ids_tipos_negocio || prod.IDs_Tipos_Negocio || ''
    const zonasAseo = prod.zonas_aseo || prod.Zonas_Aseo || ''
    const familiaProd = prod.familia || prod.Familia || ''
    
    const query = searchTerm.toLowerCase()
    const matchesSearch = nombre.toLowerCase().includes(query) || tags.toLowerCase().includes(query)
    const matchesNegocio = selectedNegocio ? idsNegocios.includes(selectedNegocio) : true
    const matchesArea = selectedArea ? zonasAseo.toLowerCase().includes(selectedArea.toLowerCase()) : true
    const matchesFamilia = selectedFamilia ? familiaProd.toLowerCase() === selectedFamilia.toLowerCase() : true

    return matchesSearch && matchesNegocio && matchesArea && matchesFamilia
  })

  const competenciaConProducto = competencia.map((comp) => {
    const idProd = comp.id_producto_ecolosia || comp.ID_Producto_Ecolosia;
    const prodAsociado = productos.find(p => (p.id_producto || p.ID_Producto) === idProd);
    const nombreProdEcolosia = prodAsociado ? (prodAsociado.nombre_producto || prodAsociado.Nombre_Producto) : idProd;
    const rendimiento = prodAsociado ? (prodAsociado.rendimiento_litros_preparados || prodAsociado.Rendimiento_Litros_Preparados) : 40;
    const dilucion = prodAsociado ? (prodAsociado.dilucion_recomendada || prodAsociado.Dilucion_Recomendada) : '1:10';
    const precioGalon = prodAsociado ? (prodAsociado.precio_galon || prodAsociado.Precio_Galon) : 160;
    const familia = prodAsociado ? (prodAsociado.familia || prodAsociado.Familia || 'Easy Negocios') : 'Easy Negocios';
    const botellasEvitadas = rendimiento;

    return { ...comp, nombreProdEcolosia, rendimiento, dilucion, precioGalon, familia, botellasEvitadas };
  });

  const competenciaFiltrada = competenciaConProducto.filter((item) => {
    const query = compSearch.toLowerCase();
    const prodNombre = (item.nombreProdEcolosia || '').toLowerCase();
    const compNombre = (item.nombre_competencia || item.Nombre_Competencia || '').toLowerCase();
    return prodNombre.includes(query) || compNombre.includes(query);
  }).sort((a, b) => a.nombreProdEcolosia.localeCompare(b.nombreProdEcolosia));

  const LogoBrand = () => (
    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setCurrentView('catalogo'); setSelectedNegocio(null); setSelectedArea(null); setSelectedFamilia(null); }}>
      <h1 style={{ color: '#2e7d32', margin: '0', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <span>🌱</span> ECOShop
      </h1>
      <span style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '2px' }}>Portal de Ventas en Campo</span>
    </div>
  );

  // 1. SI NO HAY SESIÓN: LOGIN, REGISTRO O RECUPERACIÓN
  if (!session) {
    if (authView === 'register') {
      return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '420px', margin: '30px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <LogoBrand />
            <h3 style={{ color: '#1b5e20', fontSize: '16px', marginTop: '10px' }}>📝 Registro de Nueva Vendedora</h3>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Nombre Completo *</label>
              <input 
                type="text" 
                placeholder="Ej. María Pérez"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Correo Electrónico *</label>
              <input 
                type="email" 
                placeholder="vendedora@ecolosia.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>WhatsApp / Celular *</label>
              <input 
                type="text" 
                placeholder="Ej. 4492286585"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Contraseña *</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Plan Seleccionado</label>
              <select
                value={regPlan}
                onChange={(e) => setRegPlan(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: '#fff' }}
              >
                <option value="Mensual ($50 MXN)">Mensual ($50 MXN)</option>
                <option value="Anual ($500 MXN)">Anual ($500 MXN)</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', marginTop: '5px' }}
            >
              {authLoading ? 'Registrando...' : 'Registrarme y Activar Cuenta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <button 
              onClick={() => setAuthView('login')}
              style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: 'bold' }}
            >
              ← Ya tengo cuenta, Iniciar Sesión
            </button>
          </div>
        </div>
      )
    }

    if (authView === 'forgot') {
      return (
        <div style={{ fontFamily: 'sans-serif', maxWidth: '400px', margin: '40px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <LogoBrand />
            <h3 style={{ color: '#1b5e20', fontSize: '16px', marginTop: '10px' }}>🔑 Recuperar Contraseña</h3>
          </div>

          <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', marginBottom: '20px' }}>
            Ingresa tu correo electrónico registrado y te enviaremos las instrucciones para restablecer tu contraseña.
          </p>

          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Correo Electrónico</label>
              <input 
                type="email" 
                placeholder="vendedora@ecolosia.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={authLoading}
              style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
            >
              {authLoading ? 'Enviando...' : 'Enviar Instrucciones'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => setAuthView('login')}
              style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', fontWeight: 'bold' }}
            >
              ← Volver al Inicio de Sesión
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: '400px', margin: '40px auto', background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <LogoBrand />
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="vendedora@ecolosia.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: '-5px' }}>
            <button 
              type="button"
              onClick={() => setAuthView('forgot')}
              style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button 
            type="submit"
            disabled={authLoading}
            style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', marginTop: '5px' }}
          >
            {authLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>¿Eres nueva vendedora? </span>
          <button 
            onClick={() => setAuthView('register')}
            style={{ background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Regístrate aquí 📝
          </button>
        </div>
      </div>
    )
  }

  // 2. MIENTRAS SE CARGA EL PERFIL DE SUPABASE: SPINNER
  if (profileLoading || !vendedoraPerfil) {
    return (
      <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '120px 20px', background: '#f9f9f9', minHeight: '100vh', boxSizing: 'border-box' }}>
        <LogoBrand />
        <div style={{ fontSize: '40px', margin: '20px 0' }}>⏳</div>
        <h3 style={{ color: '#2e7d32', fontSize: '18px' }}>Verificando estatus de tu cuenta...</h3>
      </div>
    )
  }

  // 3. SI EL ESTATUS NO ES "ACTIVO", BLOQUEAR ACCESO Y MOSTRAR MODAL CON DATOS BBVA
  const estatusCrudo = vendedoraPerfil?.estatus_suscripcion || vendedoraPerfil?.estatus || vendedoraPerfil?.Estatus_Suscripcion || vendedoraPerfil?.Estatus || 'EN REVISIÓN';
  const estatusSuscripcion = String(estatusCrudo).trim().toUpperCase();
  
  if (estatusSuscripcion !== 'ACTIVO') {
    const msgYaPago = `¡Hola Administrador! Ya realicé mi pago para activar mi cuenta en ECOShop.\n- Nombre: ${vendedoraPerfil?.nombre_completo}\n- Correo: ${vendedoraPerfil?.correo_electronico}\n- Plan: ${vendedoraPerfil?.plan_contratado || 'Mensual'}\nAdjunto mi comprobante de pago para que me liberen el acceso.`;
    const urlYaPago = `https://api.whatsapp.com/send?phone=4492286585&text=${encodeURIComponent(msgYaPago)}`;

    const msgFaltaPagar = `¡Hola Administrador! Soy ${vendedoraPerfil?.nombre_completo} y quiero activar mi cuenta en ECOShop (${vendedoraPerfil?.plan_contratado || 'Mensual'}). Ya tengo los datos de depósito BBVA, en cuanto realice mi pago les mando el comprobante.`;
    const urlFaltaPagar = `https://api.whatsapp.com/send?phone=4492286585&text=${encodeURIComponent(msgFaltaPagar)}`;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', overflowY: 'auto' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: '440px', borderRadius: '12px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', textAlign: 'center', boxSizing: 'border-box', margin: 'auto' }}>
          
          <div style={{ fontSize: '38px', marginBottom: '8px' }}>⏳</div>
          
          <h2 style={{ color: '#e65100', marginTop: 0, fontSize: '19px' }}>
            Cuenta Pendiente de Activación
          </h2>

          <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', marginBottom: '15px' }}>
            Hola <strong>{vendedoraPerfil?.nombre_completo}</strong>, realiza tu pago correspondiente a tu plan (<strong>{vendedoraPerfil?.plan_contratado || 'Mensual ($50 MXN)'}</strong>) a la siguiente cuenta BBVA:
          </p>

          <div style={{ background: '#f1f8e9', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #c8e6c9', textAlign: 'left', fontSize: '13px', color: '#1b5e20' }}>
            <strong>🏦 Cuenta de depósito BBVA:</strong><br/>
            • <strong>Beneficiario:</strong> Ramón Sasián Galnares<br/>
            • <strong>Número de Cuenta:</strong> 1511314494<br/>
            • <strong>CLABE Interbancaria:</strong> 012010015113144949
          </div>

          <p style={{ color: '#555', fontSize: '13px', marginBottom: '15px' }}>
            Una vez realizado el depósito, haz clic en <strong>¡Ya pagué!</strong> para enviar tu comprobante por WhatsApp:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
            <a 
              href={urlYaPago} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'block', background: '#2e7d32', color: '#fff', padding: '12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
            >
              ✅ ¡Ya pagué! Enviar Comprobante 📲
            </a>

            <a 
              href={urlFaltaPagar} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'block', background: '#00796b', color: '#fff', padding: '12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}
            >
              💬 Dudas / Notificar por WhatsApp
            </a>
          </div>

          <button 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            Cerrar Sesión / Cambiar de Cuenta
          </button>
        </div>
      </div>
    )
  }

  // 4. APLICACIÓN PRINCIPAL (SOLO PARA ESTATUS "ACTIVO")
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', background: '#f9f9f9', minHeight: '100vh', position: 'relative', paddingBottom: '70px' }}>
      
      {/* ESTILOS CSS PARA IMPRESIÓN Y PDF */}
      <style>{`
        @media print {
          header, .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          div {
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* HEADER: SE OCULTA AUTOMÁTICAMENTE EN VISTA DE COTIZACIÓN */}
      {currentView !== 'ver_cotizacion' && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 10 }}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#2e7d32', outline: 'none' }}
          >
            ☰
          </button>
          
          <LogoBrand />

          <button 
            onClick={() => setCurrentView('carrito')}
            style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', position: 'relative', outline: 'none' }}
          >
            🛒 {totalItemsInCart > 0 && <span style={{ background: '#c62828', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: '10px', position: 'absolute', top: '-6px', right: '-6px' }}>{totalItemsInCart}</span>}
          </button>
        </header>
      )}

      {/* MENÚ LATERAL */}
      {menuOpen && currentView !== 'ver_cotizacion' && (
        <div 
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', top: '60px', left: 0, width: '100%', height: 'calc(100vh - 60px)', background: 'rgba(0,0,0,0.3)', zIndex: 20 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 0, left: 0, width: '280px', background: '#fff', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', padding: '20px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <h3 style={{ color: '#1b5e20', marginTop: 0, borderBottom: '2px solid #e8f5e9', paddingBottom: '10px' }}>Menú Principal</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '15px', color: '#333' }}>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'catalogo' && !selectedNegocio && !selectedArea && !selectedFamilia ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'catalogo' && !selectedNegocio && !selectedArea && !selectedFamilia ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('catalogo'); setSelectedNegocio(null); setSelectedArea(null); setSelectedFamilia(null); setMenuOpen(false); }}
                >
                  🏠 Catálogo General
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'tipos_negocio' || selectedNegocio ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'tipos_negocio' || selectedNegocio ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('tipos_negocio'); setSelectedNegocio(null); setSelectedArea(null); setSelectedFamilia(null); setMenuOpen(false); }}
                >
                  🏢 Tipos de Negocio (B2B)
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'areas_accion' || selectedArea ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'areas_accion' || selectedArea ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('areas_accion'); setSelectedNegocio(null); setSelectedArea(null); setSelectedFamilia(null); setMenuOpen(false); }}
                >
                  🧼 Por Área de Acción
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'comparativa' ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'comparativa' ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('comparativa'); setMenuOpen(false); }}
                >
                  ⚖️ Comparativa de Ahorro
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'carrito' || currentView === 'ver_cotizacion' ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'carrito' || currentView === 'ver_cotizacion' ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('carrito'); setMenuOpen(false); }}
                >
                  🧮 Cotizador y Carrito ({totalItemsInCart})
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'crm_clientes' ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'crm_clientes' ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('crm_clientes'); setMenuOpen(false); }}
                >
                  👥 Mis Clientes (CRM)
                </li>
                <li 
                  style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', background: currentView === 'mi_cuenta' ? '#f1f8e9' : 'transparent', fontWeight: currentView === 'mi_cuenta' ? 'bold' : 'normal' }} 
                  onClick={() => { setCurrentView('mi_cuenta'); setMenuOpen(false); }}
                >
                  ⚙️ Mi Cuenta / Suscripción
                </li>
              </ul>
            </div>

            <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Sesión: <strong>{vendedoraPerfil?.nombre_completo}</strong></div>
              <button 
                onClick={handleLogout}
                style={{ width: '100%', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ padding: '20px' }}>
        
        {/* VISTA: MIS CLIENTES (CRM) */}
        {currentView === 'crm_clientes' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Gestión Comercial</span>
                <h2 style={{ color: '#1b5e20', fontSize: '18px', margin: 0 }}>👥 Mis Clientes (CRM)</h2>
              </div>
              <button 
                onClick={abrirModalNuevo}
                style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                + Nuevo Cliente
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Cartera de prospectos y clientes cautivos asignados a tu cuenta.
            </p>

            {clientes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#666' }}>No tienes clientes registrados todavía.</p>
                <button 
                  onClick={abrirModalNuevo}
                  style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
                >
                  Registrar Primer Cliente
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clientes.map((cli, idx) => {
                  const idCli = cli.id_cliente || cli.ID_Cliente || idx;
                  const nombre = cli.nombre_cliente_empresa || cli.Nombre_Cliente_Empresa || 'Cliente';
                  const tel = cli.telefono_whatsapp || cli.Telefono_WhatsApp || 'N/D';
                  const correo = cli.correo_electronico || cli.Correo_Electronico || 'N/D';
                  const tipo = cli.id_tipo_negocio || cli.ID_Tipo_Negocio || 'General';

                  return (
                    <div key={idCli} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2e7d32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, color: '#1b5e20', fontSize: '16px' }}>{nombre}</h4>
                          <span style={{ fontSize: '10px', background: '#e8f5e9', color: '#2e7d32', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{tipo}</span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>📞 WhatsApp: {tel}</p>
                        <p style={{ margin: '4px 0', fontSize: '13px', color: '#555' }}>✉️ Correo: {correo}</p>
                      </div>

                      <div style={{ marginLeft: '12px' }}>
                        <button 
                          onClick={() => abrirModalEditar(cli)}
                          style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : currentView === 'mi_cuenta' ? (
          /* VISTA: MI CUENTA / SUSCRIPCIÓN */
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '1px solid #c8e6c9' }}>
            <h2 style={{ color: '#1b5e20', marginTop: 0, fontSize: '18px', borderBottom: '2px solid #e8f5e9', paddingBottom: '10px' }}>
              ⚙️ Mi Cuenta / Suscripción
            </h2>

            <div style={{ margin: '20px 0', fontSize: '14px', color: '#333', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}><strong>Asesor:</strong> {vendedoraPerfil?.nombre_completo}</p>
              <p style={{ margin: 0 }}><strong>Correo:</strong> {vendedoraPerfil?.correo_electronico}</p>
              <p style={{ margin: 0 }}><strong>Teléfono Celular:</strong> {vendedoraPerfil?.telefono_celular}</p>
              <p style={{ margin: 0 }}><strong>Plan Contratado:</strong> {vendedoraPerfil?.plan_contratado || 'Mensual'}</p>
              <p style={{ margin: 0 }}><strong>Estatus:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{vendedoraPerfil?.estatus_suscripcion || 'ACTIVO'}</span></p>
              <p style={{ margin: 0 }}><strong>Último Pago:</strong> {vendedoraPerfil?.fecha_ultimo_pago || 'N/D'}</p>
              <p style={{ margin: 0 }}><strong>Vencimiento:</strong> {vendedoraPerfil?.fecha_vencimiento || 'N/D'}</p>
            </div>

            <div style={{ background: '#e0f2f1', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#004d40' }}>
              💡 ¿Necesitas renovar o actualizar tu membresía? Envía tu comprobante directamente con el administrador.
            </div>

            <button 
              onClick={() => {
                const msg = `Quiero renovar mi cuenta, Soy ${vendedoraPerfil?.nombre_completo}`;
                window.open(`https://api.whatsapp.com/send?phone=4492286585&text=${encodeURIComponent(msg)}`, '_blank');
              }}
              style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              📲 Contactar Soporte / Renovar por WhatsApp
            </button>
          </div>
        ) : currentView === 'ver_cotizacion' ? (
          /* VISTA: MOSTRAR COTIZACIÓN PROFESIONAL / PDF EJECUTIVO */
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #c8e6c9' }}>
            
            {/* Botón de editar carrito (Se oculta al imprimir) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2e7d32', paddingBottom: '12px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#1b5e20', margin: 0, fontSize: '22px' }}>🌱 ECOLOSÍA</h2>
                <span style={{ color: '#666', fontSize: '13px' }}>Propuesta Comercial y Ecológica Profesional</span>
              </div>
              <button 
                onClick={() => setCurrentView('carrito')}
                style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                ← Editar Carrito
              </button>
            </div>

            <div style={{ background: '#f1f8e9', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', borderLeft: '4px solid #2e7d32' }}>
              <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>Propuesta dirigida a:</span>
              <strong style={{ fontSize: '18px', color: '#1b5e20' }}>{clienteSeleccionado?.nombre_cliente_empresa || clienteSeleccionado?.Nombre_Cliente_Empresa || 'Cliente General'}</strong>
              <div style={{ color: '#444', marginTop: '6px', fontSize: '13px' }}>
                📞 WhatsApp: {clienteSeleccionado?.telefono_whatsapp || clienteSeleccionado?.Telefono_WhatsApp || 'N/D'} | ✉️ Correo: {clienteSeleccionado?.correo_electronico || clienteSeleccionado?.Correo_Electronico || 'N/D'}
              </div>
            </div>

            <h3 style={{ fontSize: '16px', color: '#1b5e20', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px', marginBottom: '15px' }}>Productos Seleccionados y Ficha Técnica</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              {cart.map((item, index) => {
                const nombre = item.nombre_producto || item.Nombre_Producto || 'Producto';
                const precio = item.precio_galon || item.Precio_Galon || 0;
                const subtotal = precio * item.cantidad;
                const familia = item.familia || item.Familia || 'Easy Negocios';
                const dilucion = item.dilucion_recomendada || item.Dilucion_Recomendada || 'N/D';
                const rendimiento = item.rendimiento_litros_preparados || item.Rendimiento_Litros_Preparados || 40;
                const imagenUrl = item.imagen_url || item.Imagen_URL || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=150';

                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    <img 
                      src={imagenUrl} 
                      alt={nombre} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', color: '#1b5e20' }}>{nombre}</h4>
                      <span style={{ fontSize: '10px', color: '#fff', background: familia === 'Easy Clean' ? '#00796b' : '#303f9f', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {familia}
                      </span>
                      <p style={{ margin: '6px 0 3px 0', fontSize: '12px', color: '#444' }}>
                        💧 <strong>Dilución:</strong> {dilucion} &nbsp;|&nbsp; 🧪 <strong>Rendimiento:</strong> {rendimiento} L prep.
                      </p>
                      <p style={{ margin: '0', fontSize: '13px', color: '#555' }}>
                        Cantidad: <strong>{item.cantidad}</strong> x ${precio} MXN
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '16px', color: '#1b5e20' }}>${subtotal} MXN</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#e8f5e9', padding: '18px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '8px' }}>
                <span>Inversión Total de la Propuesta:</span>
                <strong style={{ fontSize: '20px', color: '#1b5e20' }}>${totalInversion} MXN</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#004d40', borderTop: '1px dashed #c8e6c9', paddingTop: '8px' }}>
                ♻️ <strong>Impacto Ecológico Total:</strong> Con esta cotización evitas desechar <strong>{totalBotellasEvitadas} botellas de plástico de 1L</strong> al medio ambiente.
              </div>
            </div>

            <div style={{ borderTop: '2px solid #e8f5e9', paddingTop: '15px', fontSize: '13px', color: '#555', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>Asesor Comercial Ecolosía:</span>
                <strong style={{ fontSize: '14px', color: '#333' }}>{vendedoraAsignada.nombre_completo || vendedoraAsignada.Nombre_Completo}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>Contacto / Correo:</span>
                <strong style={{ fontSize: '13px', color: '#333' }}>{vendedoraAsignada.telefono_celular || vendedoraAsignada.Telefono_Celular} | {vendedoraAsignada.correo_electronico || vendedoraAsignada.Correo_Electronico}</strong>
              </div>
            </div>

            {/* Botones de acción (Se ocultan al imprimir mediante la clase no-print) */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleEnviarWhatsApp}
                style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
              >
                📤 Enviar Cotización por WhatsApp
              </button>
              <button 
                onClick={() => window.print()}
                style={{ width: '100%', background: '#00796b', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                🖨️ Imprimir / Guardar como PDF (Para Correo)
              </button>
            </div>
          </div>
        ) : currentView === 'carrito' ? (
          /* VISTA: CARRITO Y SELECCIÓN DE CLIENTE */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Propuesta Comercial</span>
                <h2 style={{ color: '#1b5e20', fontSize: '18px', margin: 0 }}>🧮 Cotizador y Carrito</h2>
              </div>
              <button 
                onClick={() => setCurrentView('catalogo')}
                style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
              >
                ← Catálogo
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '40px' }}>🛒</span>
                <p style={{ color: '#666', marginTop: '15px' }}>Tu cotización está vacía.</p>
                <button 
                  onClick={() => setCurrentView('catalogo')}
                  style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', color: '#1b5e20', fontWeight: 'bold' }}>
                      🏢 Seleccionar Cliente Prospecto:
                    </label>
                    <button 
                      onClick={abrirModalNuevo}
                      style={{ background: '#e8f5e9', border: '1px solid #2e7d32', color: '#2e7d32', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      + Nuevo Cliente ➕
                    </button>
                  </div>

                  <select
                    value={selectedClienteId}
                    onChange={(e) => setSelectedClienteId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', background: '#f9f9f9', outline: 'none' }}
                  >
                    <option value="">-- Selecciona un cliente del CRM --</option>
                    {clientes.map((cli, idx) => {
                      const idCli = cli.id_cliente || cli.ID_Cliente || idx;
                      const nombreCli = cli.nombre_cliente_empresa || cli.Nombre_Cliente_Empresa || 'Cliente';
                      return <option key={idCli} value={idCli}>{nombreCli}</option>;
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {cart.map((item, index) => {
                    const id = item.id_producto || item.ID_Producto || index;
                    const nombre = item.nombre_producto || item.Nombre_Producto || 'Producto';
                    const precioGalon = item.precio_galon || item.Precio_Galon || 0;
                    const subtotal = precioGalon * item.cantidad;
                    const familia = item.familia || item.Familia || 'Easy Negocios';
                    const imagenUrl = item.imagen_url || item.Imagen_URL || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=150';

                    return (
                      <div key={id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                          src={imagenUrl} 
                          alt={nombre} 
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} 
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 4px 0', color: '#1b5e20', fontSize: '15px' }}>{nombre}</h4>
                          <span style={{ fontSize: '10px', color: '#fff', background: familia === 'Easy Clean' ? '#00796b' : '#303f9f', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {familia}
                          </span>
                          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#555' }}>
                            ${precioGalon} MXN c/u
                          </p>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => updateQuantity(id, -1)}
                            style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', width: '26px', height: '26px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.cantidad}</span>
                          <button 
                            onClick={() => updateQuantity(id, 1)}
                            style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', width: '26px', height: '26px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            +
                          </button>
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '70px', marginLeft: '5px' }}>
                          <strong style={{ fontSize: '14px', color: '#1b5e20' }}>${subtotal}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2e7d32', marginBottom: '20px' }}>
                  <h3 style={{ color: '#1b5e20', marginTop: 0, fontSize: '16px', borderBottom: '1px solid #e8f5e9', paddingBottom: '8px' }}>
                    📊 Resumen de la Propuesta
                  </h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', fontSize: '14px' }}>
                    <span>Inversión Total:</span>
                    <strong style={{ color: '#1b5e20', fontSize: '16px' }}>${totalInversion} MXN</strong>
                  </div>

                  <div style={{ background: '#e0f2f1', padding: '10px', borderRadius: '6px', marginTop: '12px', fontSize: '13px', color: '#004d40' }}>
                    ♻️ <strong>Impacto Ecológico Total:</strong> Con esta cotización evitas desechar <strong>{totalBotellasEvitadas} botellas de plástico de 1L</strong> al medio ambiente.
                  </div>
                </div>

                <button 
                  onClick={() => setCurrentView('ver_cotizacion')}
                  style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', outline: 'none' }}
                >
                  👁️ Mostrar Cotización Profesional en Pantalla
                </button>
              </div>
            )}
          </div>
        ) : currentView === 'comparativa' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Análisis Comercial y Ambiental</span>
                <h2 style={{ color: '#1b5e20', fontSize: '18px', margin: 0 }}>⚖️ Comparativa de Ahorro y Ecología</h2>
              </div>
              <button 
                onClick={() => setCurrentView('catalogo')}
                style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}
              >
                ← Catálogo
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar producto Ecolosía o competencia..."
                value={compSearch}
                onChange={(e) => setCompSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: '#fff' }}
              />
            </div>

            {loading ? (
              <p style={{ textAlign: 'center' }}>Cargando análisis comparativo...</p>
            ) : competenciaFiltrada.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No se encontraron registros comparativos con ese criterio.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {competenciaFiltrada.map((comp, index) => {
                  const idComp = comp.id_comparacion || comp.ID_Comparacion || `COMP-${index}`;
                  const nombreComp = comp.nombre_competencia || comp.Nombre_Competencia || 'Competencia';
                  const costoPrepEcolosia = comp.costo_litro_preparado_ecolosia || 4.00;
                  const costoPrepComp = comp.costo_litro_preparado_competencia || comp.precio_competencia_litro || 65.00;
                  const ahorroStr = comp.porcentaje_ahorro || '93% de ahorro';
                  const { nombreProdEcolosia, rendimiento, dilucion, precioGalon, familia, botellasEvitadas } = comp;

                  return (
                    <div 
                      key={idComp} 
                      onClick={() => setModalItem({ nombreProdEcolosia, nombreComp, costoPrepEcolosia, costoPrepComp, ahorroStr, rendimiento, dilucion, precioGalon, familia, botellasEvitadas })}
                      style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2e7d32', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: '0', color: '#1b5e20', fontSize: '16px' }}>🌱 {nombreProdEcolosia}</h3>
                        <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          {ahorroStr}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f1f8e9', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '8px' }}>
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', color: '#558b2f' }}>Costo x Litro Prep. (Ecolosía)</span>
                          <strong style={{ color: '#1b5e20', fontSize: '15px' }}>${costoPrepEcolosia} MXN</strong>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', color: '#c62828' }}>Costo x Litro ({nombreComp})</span>
                          <strong style={{ color: '#c62828', fontSize: '15px' }}>${costoPrepComp} MXN</strong>
                        </div>
                      </div>

                      <div style={{ background: '#e0f2f1', padding: '8px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#004d40' }}>
                        <span>♻️</span>
                        <div>
                          <strong>Impacto Ambiental:</strong> Evita desechar <strong>{botellasEvitadas} botellas</strong> de 1L.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : currentView === 'tipos_negocio' && !selectedNegocio ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ color: '#1b5e20', fontSize: '18px', margin: 0 }}>🏢 Selecciona el Giro del Cliente</h2>
              <button 
                onClick={() => { setCurrentView('catalogo'); setSelectedNegocio(null); }}
                style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', outline: 'none' }}
              >
                Ver Todo
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {tiposNegocio.map((neg) => {
                const idNeg = neg.id_tipo_negocio || neg.ID_Tipo_Negocio;
                const nombreNeg = neg.nombre_negocio || neg.Nombre_Negocio;
                const descNeg = neg.descripcion || neg.Descripcion;
                const iconoUI = neg.icono_ui || neg.Icono_UI || '🏢';

                return (
                  <div 
                    key={idNeg}
                    onClick={() => { setSelectedNegocio(idNeg); setCurrentView('catalogo'); }}
                    style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', borderLeft: '4px solid #2e7d32', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <span style={{ fontSize: '24px' }}>{iconoUI}</span>
                    <div>
                      <h3 style={{ margin: '0 0 5px 0', color: '#1b5e20', fontSize: '16px' }}>{nombreNeg}</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{descNeg}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : currentView === 'areas_accion' && !selectedArea ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ color: '#1b5e20', fontSize: '18px', margin: 0 }}>🧼 Selecciona el Área de Acción</h2>
              <button 
                onClick={() => { setCurrentView('catalogo'); setSelectedArea(null); }}
                style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', outline: 'none' }}
              >
                Ver Todo
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              {areasAccion.map((area) => (
                <div 
                  key={area.id}
                  onClick={() => { setSelectedArea(area.id); setCurrentView('catalogo'); }}
                  style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', borderLeft: '4px solid #558b2f', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <span style={{ fontSize: '24px' }}>{area.icono}</span>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#1b5e20', fontSize: '16px' }}>{area.nombre}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{area.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* VISTA C: CATÁLOGO DE PRODUCTOS */
          <div>
            {selectedNegocio && (
              <div style={{ background: '#e8f5e9', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Giro Comercial Seleccionado</span>
                  <h2 style={{ color: '#1b5e20', fontSize: '15px', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {iconoNegocioActual} {nombreNegocioActual}
                  </h2>
                </div>
                <button 
                  onClick={() => { setSelectedNegocio(null); setCurrentView('tipos_negocio'); }}
                  style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', outline: 'none', flexShrink: 0 }}
                >
                  ← Giro
                </button>
              </div>
            )}

            {selectedArea && (
              <div style={{ background: '#e8f5e9', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #c8e6c9', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: '#558b2f', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Área de Acción Seleccionada</span>
                  <h2 style={{ color: '#1b5e20', fontSize: '15px', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    🧼 {selectedArea}
                  </h2>
                </div>
                <button 
                  onClick={() => { setSelectedArea(null); setCurrentView('areas_accion'); }}
                  style={{ background: '#2e7d32', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', outline: 'none', flexShrink: 0 }}
                >
                  ← Área
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button 
                onClick={() => setSelectedFamilia(null)}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #c8e6c9', background: !selectedFamilia ? '#2e7d32' : '#fff', color: !selectedFamilia ? '#fff' : '#2e7d32', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🌱 Todas
              </button>
              <button 
                onClick={() => setSelectedFamilia('Easy Clean')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #c8e6c9', background: selectedFamilia === 'Easy Clean' ? '#2e7d32' : '#fff', color: selectedFamilia === 'Easy Clean' ? '#fff' : '#2e7d32', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🏠 Easy Clean
              </button>
              <button 
                onClick={() => setSelectedFamilia('Easy Negocios')}
                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #c8e6c9', background: selectedFamilia === 'Easy Negocios' ? '#2e7d32' : '#fff', color: selectedFamilia === 'Easy Negocios' ? '#fff' : '#2e7d32', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🏢 Easy Negocios
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por producto, cochambre, sarro, pisos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: '#fff' }}
              />
            </div>

            {loading ? (
              <p style={{ textAlign: 'center' }}>Cargando catálogo desde Supabase...</p>
            ) : productosFiltrados.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666' }}>No se encontraron productos con ese criterio.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {productosFiltrados.map((prod, index) => {
                  const id = prod.id_producto || prod.ID_Producto || `PROD-${index}`;
                  const nombre = prod.nombre_producto || prod.Nombre_Producto || 'Sin nombre';
                  const dilucion = prod.dilucion_recomendada || prod.Dilucion_Recomendada || 'N/D';
                  const precioLitro = prod.precio_litro || prod.Precio_Litro || 0;
                  const precioGalon = prod.precio_galon || prod.Precio_Galon || 0;
                  const rendimiento = prod.rendimiento_litros_preparados || prod.Rendimiento_Litros_Preparados || 0;
                  const familia = prod.familia || prod.Familia || 'Easy Negocios';
                  const tipoMugre = prod.tipo_mugre || prod.Tipo_Mugre || 'Limpieza y sanitización profesional';
                  const imagenUrl = prod.imagen_url || prod.Imagen_URL || 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=150';
                  const botellasEvitadas = rendimiento;

                  return (
                    <div 
                      key={id} 
                      style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #2e7d32' }}
                    >
                      <div onClick={() => setModalItem({ nombreProdEcolosia: nombre, dilucion, precioLitro, precioGalon, rendimiento, familia, tipoMugre, botellasEvitadas, imagenUrl })} style={{ cursor: 'pointer' }}>
                        
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <img 
                            src={imagenUrl} 
                            alt={nombre} 
                            style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd', flexShrink: 0 }} 
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <h3 style={{ margin: '0', color: '#1b5e20', fontSize: '15px' }}>{nombre}</h3>
                            </div>
                            <span style={{ fontSize: '10px', color: '#fff', background: familia === 'Easy Clean' ? '#00796b' : '#303f9f', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                              {familia}
                            </span>
                            <p style={{ fontSize: '12px', color: '#555', margin: '5px 0 0 0', fontStyle: 'italic' }}>
                              {tipoMugre}
                            </p>
                          </div>
                        </div>

                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0' }}>
                          <strong>Dilución:</strong> {dilucion}
                        </p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f1f8e9', padding: '10px', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: '#558b2f' }}>Precio Presentación</span>
                            <span><strong>${precioGalon} MXN</strong></span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: '#558b2f' }}>Rendimiento</span>
                            <span><strong>{rendimiento} L prep.</strong></span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', color: '#558b2f' }}>Costo x Litro Prep.</span>
                            <span><strong>${precioLitro} MXN</strong></span>
                          </div>
                        </div>

                        <div style={{ background: '#e0f2f1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', color: '#004d40', marginBottom: '10px' }}>
                          ♻️ <strong>Impacto ecológico:</strong> Rinde <strong>{botellasEvitadas} L</strong> (equivale a evitar {botellasEvitadas} botellas de 1L).
                        </div>
                      </div>

                      <button 
                        onClick={() => addToCart(prod)}
                        style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', outline: 'none' }}
                      >
                        + Agregar a Cotización 🛒
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL DETALLE DE PRODUCTO */}
      {modalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '12px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', boxSizing: 'border-box', textAlign: 'center' }}>
            <button 
              onClick={() => setModalItem(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666', outline: 'none' }}
            >
              ✕
            </button>

            <img 
              src={modalItem.imagenUrl} 
              alt={modalItem.nombreProdEcolosia} 
              style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #ddd', marginBottom: '15px' }} 
            />

            <h3 style={{ color: '#1b5e20', marginTop: 0, fontSize: '18px', borderBottom: '2px solid #e8f5e9', paddingBottom: '10px' }}>
              {modalItem.nombreProdEcolosia}
            </h3>

            <div style={{ margin: '15px 0', fontSize: '14px', color: '#333', textAlign: 'left' }}>
              <p style={{ margin: '8px 0' }}><strong>Familia:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>{modalItem.familia || 'Easy Negocios'}</span></p>
              <p style={{ margin: '8px 0' }}><strong>Función / Acción:</strong> <span style={{ fontStyle: 'italic' }}>{modalItem.tipoMugre}</span></p>
              <p style={{ margin: '8px 0' }}><strong>Dilución Recomendada:</strong> {modalItem.dilucion || '1:10'}</p>
              <p style={{ margin: '8px 0' }}><strong>Rendimiento Total:</strong> {modalItem.rendimiento || 40} Litros preparados</p>
              <p style={{ margin: '8px 0' }}><strong>Inversión Presentación:</strong> ${modalItem.precioGalon || 160} MXN</p>
            </div>

            <div style={{ background: '#e0f2f1', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #b2dfdb', color: '#004d40', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px' }}>♻️ Sostenibilidad y Cuidado al Ambiente:</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Con 1 sola presentación se preparan <strong>{modalItem.botellasEvitadas || 40} litros</strong>, evitando desechar <strong>{modalItem.botellasEvitadas || 40} botellas individuales de 1L</strong> al medio ambiente.
              </p>
            </div>

            <button 
              onClick={() => setModalItem(null)}
              style={{ width: '100%', background: '#2e7d32', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', outline: 'none' }}
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR CLIENTE */}
      {showClienteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '420px', borderRadius: '12px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative', boxSizing: 'border-box' }}>
            <button 
              onClick={() => setShowClienteModal(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666', outline: 'none' }}
            >
              ✕
            </button>

            <h3 style={{ color: '#1b5e20', marginTop: 0, fontSize: '18px', borderBottom: '2px solid #e8f5e9', paddingBottom: '10px' }}>
              {editingClienteId ? '✏️ Editar Cliente' : '➕ Registrar Nuevo Cliente'}
            </h3>

            <form onSubmit={handleGuardarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Nombre o Empresa *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Restaurante Las Brisas"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>WhatsApp *</label>
                <input 
                  type="text" 
                  placeholder="Ej. 4492286585"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  placeholder="contacto@negocio.com"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Tipo de Negocio</label>
                <select
                  value={nuevoTipoNegocio}
                  onChange={(e) => setNuevoTipoNegocio(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #c8e6c9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', background: '#fff' }}
                >
                  <option value="REST">Restaurantes y Alimentos</option>
                  <option value="HOGAR">Hogar y Residencial</option>
                  <option value="HOSP">Hospitales y Clínicas</option>
                  <option value="GIM">Gimnasios y Escuelas</option>
                  <option value="AUTO">Autolavados y Talleres</option>
                  <option value="OFIC">Oficinas y Corporativos</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={() => setShowClienteModal(false)}
                  style={{ flex: 1, background: '#f1f8e9', border: '1px solid #c8e6c9', color: '#2e7d32', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  style={{ flex: 1, background: '#2e7d32', border: 'none', color: '#fff', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >
                  {editingClienteId ? 'Actualizar Cliente' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}