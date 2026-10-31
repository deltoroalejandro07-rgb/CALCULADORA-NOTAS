
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ajustes_logistica": {
                  Row: {
                    "actualizado_at": string,"almacen_direccion": string | null,"almacen_lat": number | null,"almacen_lng": number | null,"hora_salida": string,"id": boolean,"minutos_descarga": number,"volver_almacen": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_at"?: string,"almacen_direccion"?: string | null,"almacen_lat"?: number | null,"almacen_lng"?: number | null,"hora_salida"?: string,"id"?: boolean,"minutos_descarga"?: number,"volver_almacen"?: boolean
                  }
                  Update: {
                    "actualizado_at"?: string,"almacen_direccion"?: string | null,"almacen_lat"?: number | null,"almacen_lng"?: number | null,"hora_salida"?: string,"id"?: boolean,"minutos_descarga"?: number,"volver_almacen"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"albaranes": {
                  Row: {
                    "archivo_path": string | null,"bultos": number | null,"creado_at": string,"creado_por": string | null,"destino_id": string,"estado": string,"fecha": string | null,"id": string,"lineas": NonNullable<Json>,"notas": string | null,"numero": string | null,"origen": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archivo_path"?: string | null,"bultos"?: number | null,"creado_at"?: string,"creado_por"?: string | null,"destino_id": string,"estado"?: string,"fecha"?: string | null,"id"?: string,"lineas"?: NonNullable<Json>,"notas"?: string | null,"numero"?: string | null,"origen"?: string
                  }
                  Update: {
                    "archivo_path"?: string | null,"bultos"?: number | null,"creado_at"?: string,"creado_por"?: string | null,"destino_id"?: string,"estado"?: string,"fecha"?: string | null,"id"?: string,"lineas"?: NonNullable<Json>,"notas"?: string | null,"numero"?: string | null,"origen"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "albaranes_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "albaranes_destino_id_fkey"
      columns: ["destino_id"]
isOneToOne: false
      referencedRelation: "destinos"
      referencedColumns: ["id"]
    }
                  ]
                },"campanas": {
                  Row: {
                    "canal": Database["public"]['Enums']["canal_mensaje"],"creado_at": string,"creado_por": string | null,"filtro": NonNullable<Json>,"id": string,"is_seed": boolean,"nombre": string,"oferta_id": string | null,"plantilla_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "canal": Database["public"]['Enums']["canal_mensaje"],"creado_at"?: string,"creado_por"?: string | null,"filtro"?: NonNullable<Json>,"id"?: string,"is_seed"?: boolean,"nombre": string,"oferta_id"?: string | null,"plantilla_id"?: string | null
                  }
                  Update: {
                    "canal"?: Database["public"]['Enums']["canal_mensaje"],"creado_at"?: string,"creado_por"?: string | null,"filtro"?: NonNullable<Json>,"id"?: string,"is_seed"?: boolean,"nombre"?: string,"oferta_id"?: string | null,"plantilla_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "campanas_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campanas_oferta_id_fkey"
      columns: ["oferta_id"]
isOneToOne: false
      referencedRelation: "ofertas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campanas_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "plantillas"
      referencedColumns: ["id"]
    }
                  ]
                },"cliente_productos_interes": {
                  Row: {
                    "cliente_id": string,"creado_at": string,"origen_visita_id": string | null,"producto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"creado_at"?: string,"origen_visita_id"?: string | null,"producto_id": string
                  }
                  Update: {
                    "cliente_id"?: string,"creado_at"?: string,"origen_visita_id"?: string | null,"producto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cliente_productos_interes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cliente_productos_interes_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes": {
                  Row: {
                    "actualizado_at": string,"codigo_postal": string | null,"comercial_id": string | null,"consentimiento_at": string | null,"consentimiento_origen": Database["public"]['Enums']["origen_consentimiento"] | null,"consiente_email": boolean,"consiente_whatsapp": boolean,"contacto_cargo": string | null,"contacto_nombre": string | null,"creado_at": string,"creado_por": string | null,"direccion": string | null,"email": string | null,"estado": Database["public"]['Enums']["estado_cliente"],"etiquetas": (string)[],"horario_visita": string | null,"id": string,"is_seed": boolean,"lat": number | null,"lng": number | null,"localidad": string | null,"motivo_perdida": string | null,"nombre_negocio": string,"notas": string | null,"proveedor_actual": string | null,"proxima_accion": string | null,"proxima_accion_fecha": string | null,"telefono": string | null,"tipo": Database["public"]['Enums']["tipo_negocio"],"ultima_visita_at": string | null,"ultimo_pedido_at": string | null,"ultimo_resultado": Database["public"]['Enums']["resultado_visita"] | null,"ultimo_resultado_at": string | null,"volumen_estimado_eur": number | null,"zona": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_at"?: string,"codigo_postal"?: string | null,"comercial_id"?: string | null,"consentimiento_at"?: string | null,"consentimiento_origen"?: Database["public"]['Enums']["origen_consentimiento"] | null,"consiente_email"?: boolean,"consiente_whatsapp"?: boolean,"contacto_cargo"?: string | null,"contacto_nombre"?: string | null,"creado_at"?: string,"creado_por"?: string | null,"direccion"?: string | null,"email"?: string | null,"estado"?: Database["public"]['Enums']["estado_cliente"],"etiquetas"?: (string)[],"horario_visita"?: string | null,"id"?: string,"is_seed"?: boolean,"lat"?: number | null,"lng"?: number | null,"localidad"?: string | null,"motivo_perdida"?: string | null,"nombre_negocio": string,"notas"?: string | null,"proveedor_actual"?: string | null,"proxima_accion"?: string | null,"proxima_accion_fecha"?: string | null,"telefono"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_negocio"],"ultima_visita_at"?: string | null,"ultimo_pedido_at"?: string | null,"ultimo_resultado"?: Database["public"]['Enums']["resultado_visita"] | null,"ultimo_resultado_at"?: string | null,"volumen_estimado_eur"?: number | null,"zona"?: string | null
                  }
                  Update: {
                    "actualizado_at"?: string,"codigo_postal"?: string | null,"comercial_id"?: string | null,"consentimiento_at"?: string | null,"consentimiento_origen"?: Database["public"]['Enums']["origen_consentimiento"] | null,"consiente_email"?: boolean,"consiente_whatsapp"?: boolean,"contacto_cargo"?: string | null,"contacto_nombre"?: string | null,"creado_at"?: string,"creado_por"?: string | null,"direccion"?: string | null,"email"?: string | null,"estado"?: Database["public"]['Enums']["estado_cliente"],"etiquetas"?: (string)[],"horario_visita"?: string | null,"id"?: string,"is_seed"?: boolean,"lat"?: number | null,"lng"?: number | null,"localidad"?: string | null,"motivo_perdida"?: string | null,"nombre_negocio"?: string,"notas"?: string | null,"proveedor_actual"?: string | null,"proxima_accion"?: string | null,"proxima_accion_fecha"?: string | null,"telefono"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_negocio"],"ultima_visita_at"?: string | null,"ultimo_pedido_at"?: string | null,"ultimo_resultado"?: Database["public"]['Enums']["resultado_visita"] | null,"ultimo_resultado_at"?: string | null,"volumen_estimado_eur"?: number | null,"zona"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_comercial_id_fkey"
      columns: ["comercial_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clientes_entrega": {
                  Row: {
                    "actualizado_at": string,"actualizado_por": string | null,"cliente_id": string,"horario_entrega": string | null,"notas_acceso": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_at"?: string,"actualizado_por"?: string | null,"cliente_id": string,"horario_entrega"?: string | null,"notas_acceso"?: string | null
                  }
                  Update: {
                    "actualizado_at"?: string,"actualizado_por"?: string | null,"cliente_id"?: string,"horario_entrega"?: string | null,"notas_acceso"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_entrega_actualizado_por_fkey"
      columns: ["actualizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clientes_entrega_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: true
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    }
                  ]
                },"consentimientos": {
                  Row: {
                    "canal": Database["public"]['Enums']["canal_mensaje"],"cliente_id": string,"evidencia": string | null,"id": string,"origen": Database["public"]['Enums']["origen_consentimiento"],"otorgado": boolean,"registrado_at": string,"registrado_por": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "canal": Database["public"]['Enums']["canal_mensaje"],"cliente_id": string,"evidencia"?: string | null,"id"?: string,"origen": Database["public"]['Enums']["origen_consentimiento"],"otorgado": boolean,"registrado_at"?: string,"registrado_por"?: string | null
                  }
                  Update: {
                    "canal"?: Database["public"]['Enums']["canal_mensaje"],"cliente_id"?: string,"evidencia"?: string | null,"id"?: string,"origen"?: Database["public"]['Enums']["origen_consentimiento"],"otorgado"?: boolean,"registrado_at"?: string,"registrado_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consentimientos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consentimientos_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"destinos": {
                  Row: {
                    "actualizado_at": string,"clave": string,"codigo_postal": string | null,"creado_at": string,"direccion": string | null,"horario_texto": string | null,"id": string,"lat": number | null,"lng": number | null,"localidad": string | null,"minutos_descarga": number | null,"nombre": string,"notas_acceso": string | null,"telefono": string | null,"ubicacion_origen": string | null,"ventana_desde": string | null,"ventana_hasta": string | null,"zona_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actualizado_at"?: string,"clave": string,"codigo_postal"?: string | null,"creado_at"?: string,"direccion"?: string | null,"horario_texto"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"localidad"?: string | null,"minutos_descarga"?: number | null,"nombre": string,"notas_acceso"?: string | null,"telefono"?: string | null,"ubicacion_origen"?: string | null,"ventana_desde"?: string | null,"ventana_hasta"?: string | null,"zona_id"?: string | null
                  }
                  Update: {
                    "actualizado_at"?: string,"clave"?: string,"codigo_postal"?: string | null,"creado_at"?: string,"direccion"?: string | null,"horario_texto"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"localidad"?: string | null,"minutos_descarga"?: number | null,"nombre"?: string,"notas_acceso"?: string | null,"telefono"?: string | null,"ubicacion_origen"?: string | null,"ventana_desde"?: string | null,"ventana_hasta"?: string | null,"zona_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "destinos_zona_id_fkey"
      columns: ["zona_id"]
isOneToOne: false
      referencedRelation: "zonas_reparto"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos_reparto": {
                  Row: {
                    "creado_at": string,"detalle": Json | null,"id": number,"parada_id": string | null,"ruta_id": string | null,"tipo": string,"usuario_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_at"?: string,"detalle"?: Json | null,"id"?: never,"parada_id"?: string | null,"ruta_id"?: string | null,"tipo": string,"usuario_id"?: string | null
                  }
                  Update: {
                    "creado_at"?: string,"detalle"?: Json | null,"id"?: never,"parada_id"?: string | null,"ruta_id"?: string | null,"tipo"?: string,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eventos_reparto_parada_id_fkey"
      columns: ["parada_id"]
isOneToOne: false
      referencedRelation: "paradas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eventos_reparto_ruta_id_fkey"
      columns: ["ruta_id"]
isOneToOne: false
      referencedRelation: "rutas"
      referencedColumns: ["id"]
    }
                  ]
                },"mensajes": {
                  Row: {
                    "asunto": string | null,"campana_id": string | null,"canal": Database["public"]['Enums']["canal_mensaje"],"cliente_id": string,"comercial_id": string | null,"creado_at": string,"enviado_at": string | null,"estado": Database["public"]['Enums']["estado_mensaje"],"id": string,"is_seed": boolean,"oferta_id": string | null,"plantilla_id": string | null,"proveedor_id": string | null,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "asunto"?: string | null,"campana_id"?: string | null,"canal": Database["public"]['Enums']["canal_mensaje"],"cliente_id": string,"comercial_id"?: string | null,"creado_at"?: string,"enviado_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_mensaje"],"id"?: string,"is_seed"?: boolean,"oferta_id"?: string | null,"plantilla_id"?: string | null,"proveedor_id"?: string | null,"texto": string
                  }
                  Update: {
                    "asunto"?: string | null,"campana_id"?: string | null,"canal"?: Database["public"]['Enums']["canal_mensaje"],"cliente_id"?: string,"comercial_id"?: string | null,"creado_at"?: string,"enviado_at"?: string | null,"estado"?: Database["public"]['Enums']["estado_mensaje"],"id"?: string,"is_seed"?: boolean,"oferta_id"?: string | null,"plantilla_id"?: string | null,"proveedor_id"?: string | null,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mensajes_campana_id_fkey"
      columns: ["campana_id"]
isOneToOne: false
      referencedRelation: "campanas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_comercial_id_fkey"
      columns: ["comercial_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_oferta_id_fkey"
      columns: ["oferta_id"]
isOneToOne: false
      referencedRelation: "ofertas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mensajes_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "plantillas"
      referencedColumns: ["id"]
    }
                  ]
                },"oferta_productos": {
                  Row: {
                    "oferta_id": string,"producto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "oferta_id": string,"producto_id": string
                  }
                  Update: {
                    "oferta_id"?: string,"producto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "oferta_productos_oferta_id_fkey"
      columns: ["oferta_id"]
isOneToOne: false
      referencedRelation: "ofertas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "oferta_productos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"ofertas": {
                  Row: {
                    "activa": boolean,"condicion": string | null,"creado_at": string,"descripcion": string | null,"descuento_pct": number | null,"fecha_fin": string,"fecha_inicio": string,"id": string,"is_seed": boolean,"segmento_estados": (Database["public"]['Enums']["estado_cliente"])[],"segmento_productos": (string)[],"segmento_tipos": (Database["public"]['Enums']["tipo_negocio"])[],"segmento_zonas": (string)[],"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"condicion"?: string | null,"creado_at"?: string,"descripcion"?: string | null,"descuento_pct"?: number | null,"fecha_fin": string,"fecha_inicio": string,"id"?: string,"is_seed"?: boolean,"segmento_estados"?: (Database["public"]['Enums']["estado_cliente"])[],"segmento_productos"?: (string)[],"segmento_tipos"?: (Database["public"]['Enums']["tipo_negocio"])[],"segmento_zonas"?: (string)[],"titulo": string
                  }
                  Update: {
                    "activa"?: boolean,"condicion"?: string | null,"creado_at"?: string,"descripcion"?: string | null,"descuento_pct"?: number | null,"fecha_fin"?: string,"fecha_inicio"?: string,"id"?: string,"is_seed"?: boolean,"segmento_estados"?: (Database["public"]['Enums']["estado_cliente"])[],"segmento_productos"?: (string)[],"segmento_tipos"?: (Database["public"]['Enums']["tipo_negocio"])[],"segmento_zonas"?: (string)[],"titulo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"paradas": {
                  Row: {
                    "albaran_id": string | null,"cliente_id": string | null,"cobrado": number | null,"creado_at": string,"destino_id": string | null,"entrega_id": string | null,"envases_entregados": number,"envases_recogidos": number,"estado": Database["public"]['Enums']["estado_parada"],"firma_path": string | null,"firmante": string | null,"forma_cobro": string | null,"fotos": (string)[],"id": string,"lat": number | null,"lineas": NonNullable<Json>,"llegada_prevista": string | null,"lng": number | null,"motivo_fallo": string | null,"notas_oficina": string | null,"observaciones": string | null,"orden": number,"pedido_id": string | null,"precision_m": number | null,"realizada_at": string | null,"registrada_at": string | null,"registrada_por": string | null,"ruta_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "albaran_id"?: string | null,"cliente_id"?: string | null,"cobrado"?: number | null,"creado_at"?: string,"destino_id"?: string | null,"entrega_id"?: string | null,"envases_entregados"?: number,"envases_recogidos"?: number,"estado"?: Database["public"]['Enums']["estado_parada"],"firma_path"?: string | null,"firmante"?: string | null,"forma_cobro"?: string | null,"fotos"?: (string)[],"id"?: string,"lat"?: number | null,"lineas"?: NonNullable<Json>,"llegada_prevista"?: string | null,"lng"?: number | null,"motivo_fallo"?: string | null,"notas_oficina"?: string | null,"observaciones"?: string | null,"orden": number,"pedido_id"?: string | null,"precision_m"?: number | null,"realizada_at"?: string | null,"registrada_at"?: string | null,"registrada_por"?: string | null,"ruta_id": string
                  }
                  Update: {
                    "albaran_id"?: string | null,"cliente_id"?: string | null,"cobrado"?: number | null,"creado_at"?: string,"destino_id"?: string | null,"entrega_id"?: string | null,"envases_entregados"?: number,"envases_recogidos"?: number,"estado"?: Database["public"]['Enums']["estado_parada"],"firma_path"?: string | null,"firmante"?: string | null,"forma_cobro"?: string | null,"fotos"?: (string)[],"id"?: string,"lat"?: number | null,"lineas"?: NonNullable<Json>,"llegada_prevista"?: string | null,"lng"?: number | null,"motivo_fallo"?: string | null,"notas_oficina"?: string | null,"observaciones"?: string | null,"orden"?: number,"pedido_id"?: string | null,"precision_m"?: number | null,"realizada_at"?: string | null,"registrada_at"?: string | null,"registrada_por"?: string | null,"ruta_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "paradas_albaran_id_fkey"
      columns: ["albaran_id"]
isOneToOne: false
      referencedRelation: "albaranes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_destino_id_fkey"
      columns: ["destino_id"]
isOneToOne: false
      referencedRelation: "destinos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos_por_repartir"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_registrada_por_fkey"
      columns: ["registrada_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "paradas_ruta_id_fkey"
      columns: ["ruta_id"]
isOneToOne: false
      referencedRelation: "rutas"
      referencedColumns: ["id"]
    }
                  ]
                },"pedido_lineas": {
                  Row: {
                    "cantidad": number,"descripcion": string,"id": string,"importe": number | null,"pedido_id": string,"precio_unitario": number,"producto_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"descripcion": string,"id"?: string,"importe"?: never,"pedido_id": string,"precio_unitario": number,"producto_id"?: string | null
                  }
                  Update: {
                    "cantidad"?: number,"descripcion"?: string,"id"?: string,"importe"?: never,"pedido_id"?: string,"precio_unitario"?: number,"producto_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_lineas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_lineas_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos_por_repartir"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_lineas_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "cliente_id": string,"comercial_id": string | null,"creado_at": string,"fecha": string,"id": string,"importe_total": number,"is_seed": boolean,"notas": string | null,"visita_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"comercial_id"?: string | null,"creado_at"?: string,"fecha"?: string,"id"?: string,"importe_total"?: number,"is_seed"?: boolean,"notas"?: string | null,"visita_id"?: string | null
                  }
                  Update: {
                    "cliente_id"?: string,"comercial_id"?: string | null,"creado_at"?: string,"fecha"?: string,"id"?: string,"importe_total"?: number,"is_seed"?: boolean,"notas"?: string | null,"visita_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_comercial_id_fkey"
      columns: ["comercial_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_visita_id_fkey"
      columns: ["visita_id"]
isOneToOne: false
      referencedRelation: "visitas"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "activo": boolean,"creado_at": string,"email": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_usuario"],"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"creado_at"?: string,"email": string,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_usuario"],"telefono"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"creado_at"?: string,"email"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_usuario"],"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"plantillas": {
                  Row: {
                    "activa": boolean,"asunto": string | null,"canal": Database["public"]['Enums']["canal_mensaje"],"creado_at": string,"cuerpo": string,"id": string,"is_seed": boolean,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"asunto"?: string | null,"canal": Database["public"]['Enums']["canal_mensaje"],"creado_at"?: string,"cuerpo": string,"id"?: string,"is_seed"?: boolean,"nombre": string
                  }
                  Update: {
                    "activa"?: boolean,"asunto"?: string | null,"canal"?: Database["public"]['Enums']["canal_mensaje"],"creado_at"?: string,"cuerpo"?: string,"id"?: string,"is_seed"?: boolean,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"categoria": Database["public"]['Enums']["categoria_producto"],"creado_at": string,"destacado": boolean,"formato": string | null,"id": string,"imagen_path": string | null,"is_seed": boolean,"nombre": string,"precio_tarifa": number,"referencia": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria": Database["public"]['Enums']["categoria_producto"],"creado_at"?: string,"destacado"?: boolean,"formato"?: string | null,"id"?: string,"imagen_path"?: string | null,"is_seed"?: boolean,"nombre": string,"precio_tarifa": number,"referencia"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"categoria"?: Database["public"]['Enums']["categoria_producto"],"creado_at"?: string,"destacado"?: boolean,"formato"?: string | null,"id"?: string,"imagen_path"?: string | null,"is_seed"?: boolean,"nombre"?: string,"precio_tarifa"?: number,"referencia"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"rutas": {
                  Row: {
                    "conductor_id": string | null,"creado_at": string,"creado_por": string | null,"estado": Database["public"]['Enums']["estado_ruta"],"fecha": string,"id": string,"iniciada_at": string | null,"notas": string | null,"terminada_at": string | null,"vehiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conductor_id"?: string | null,"creado_at"?: string,"creado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_ruta"],"fecha": string,"id"?: string,"iniciada_at"?: string | null,"notas"?: string | null,"terminada_at"?: string | null,"vehiculo_id"?: string | null
                  }
                  Update: {
                    "conductor_id"?: string | null,"creado_at"?: string,"creado_por"?: string | null,"estado"?: Database["public"]['Enums']["estado_ruta"],"fecha"?: string,"id"?: string,"iniciada_at"?: string | null,"notas"?: string | null,"terminada_at"?: string | null,"vehiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rutas_conductor_id_fkey"
      columns: ["conductor_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rutas_creado_por_fkey"
      columns: ["creado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rutas_vehiculo_id_fkey"
      columns: ["vehiculo_id"]
isOneToOne: false
      referencedRelation: "vehiculos"
      referencedColumns: ["id"]
    }
                  ]
                },"vehiculos": {
                  Row: {
                    "activo": boolean,"capacidad_bultos": number | null,"capacidad_kg": number | null,"conductor_habitual": string | null,"creado_at": string,"etiqueta_ambiental": string | null,"id": string,"matricula": string | null,"nombre": string,"notas": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"capacidad_bultos"?: number | null,"capacidad_kg"?: number | null,"conductor_habitual"?: string | null,"creado_at"?: string,"etiqueta_ambiental"?: string | null,"id"?: string,"matricula"?: string | null,"nombre": string,"notas"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"capacidad_bultos"?: number | null,"capacidad_kg"?: number | null,"conductor_habitual"?: string | null,"creado_at"?: string,"etiqueta_ambiental"?: string | null,"id"?: string,"matricula"?: string | null,"nombre"?: string,"notas"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehiculos_conductor_habitual_fkey"
      columns: ["conductor_habitual"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"visita_fotos": {
                  Row: {
                    "creado_at": string,"id": string,"storage_path": string,"tipo": Database["public"]['Enums']["tipo_foto"],"visita_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_at"?: string,"id"?: string,"storage_path": string,"tipo"?: Database["public"]['Enums']["tipo_foto"],"visita_id": string
                  }
                  Update: {
                    "creado_at"?: string,"id"?: string,"storage_path"?: string,"tipo"?: Database["public"]['Enums']["tipo_foto"],"visita_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visita_fotos_visita_id_fkey"
      columns: ["visita_id"]
isOneToOne: false
      referencedRelation: "visitas"
      referencedColumns: ["id"]
    }
                  ]
                },"visita_productos": {
                  Row: {
                    "producto_id": string,"relacion": string,"visita_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "producto_id": string,"relacion": string,"visita_id": string
                  }
                  Update: {
                    "producto_id"?: string,"relacion"?: string,"visita_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visita_productos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visita_productos_visita_id_fkey"
      columns: ["visita_id"]
isOneToOne: false
      referencedRelation: "visitas"
      referencedColumns: ["id"]
    }
                  ]
                },"visitas": {
                  Row: {
                    "cliente_id": string,"comercial_id": string,"fecha": string,"id": string,"is_seed": boolean,"lat": number | null,"lng": number | null,"material_entregado": (string)[],"notas": string | null,"precision_m": number | null,"proxima_accion": string | null,"proxima_accion_fecha": string | null,"resultado": Database["public"]['Enums']["resultado_visita"],"sincronizado_at": string,"tipo": Database["public"]['Enums']["tipo_visita"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_id": string,"comercial_id"?: string,"fecha"?: string,"id"?: string,"is_seed"?: boolean,"lat"?: number | null,"lng"?: number | null,"material_entregado"?: (string)[],"notas"?: string | null,"precision_m"?: number | null,"proxima_accion"?: string | null,"proxima_accion_fecha"?: string | null,"resultado": Database["public"]['Enums']["resultado_visita"],"sincronizado_at"?: string,"tipo": Database["public"]['Enums']["tipo_visita"]
                  }
                  Update: {
                    "cliente_id"?: string,"comercial_id"?: string,"fecha"?: string,"id"?: string,"is_seed"?: boolean,"lat"?: number | null,"lng"?: number | null,"material_entregado"?: (string)[],"notas"?: string | null,"precision_m"?: number | null,"proxima_accion"?: string | null,"proxima_accion_fecha"?: string | null,"resultado"?: Database["public"]['Enums']["resultado_visita"],"sincronizado_at"?: string,"tipo"?: Database["public"]['Enums']["tipo_visita"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "visitas_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visitas_comercial_id_fkey"
      columns: ["comercial_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"zonas_reparto": {
                  Row: {
                    "activa": boolean,"color": string | null,"creado_at": string,"dias": (number)[],"id": string,"nombre": string,"vehiculo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"color"?: string | null,"creado_at"?: string,"dias"?: (number)[],"id"?: string,"nombre": string,"vehiculo_id"?: string | null
                  }
                  Update: {
                    "activa"?: boolean,"color"?: string | null,"creado_at"?: string,"dias"?: (number)[],"id"?: string,"nombre"?: string,"vehiculo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "zonas_reparto_vehiculo_id_fkey"
      columns: ["vehiculo_id"]
isOneToOne: false
      referencedRelation: "vehiculos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "pedidos_por_repartir": {
                  Row: {
                    "cliente_id": string | null,"comercial_id": string | null,"creado_at": string | null,"fecha": string | null,"id": string | null,"importe_total": number | null,"is_seed": boolean | null,"notas": string | null,"visita_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "cliente_id"?: string | null,"comercial_id"?: string | null,"creado_at"?: string | null,"fecha"?: string | null,"id"?: string | null,"importe_total"?: number | null,"is_seed"?: boolean | null,"notas"?: string | null,"visita_id"?: string | null
                         }
                        Update: {
                           "cliente_id"?: string | null,"comercial_id"?: string | null,"creado_at"?: string | null,"fecha"?: string | null,"id"?: string | null,"importe_total"?: number | null,"is_seed"?: boolean | null,"notas"?: string | null,"visita_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "pedidos_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_comercial_id_fkey"
      columns: ["comercial_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_visita_id_fkey"
      columns: ["visita_id"]
isOneToOne: false
      referencedRelation: "visitas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "buscar_posibles_duplicados":
{ Args: { "p_nombre": string,"p_telefono"?: string }; Returns: {
              "comercial": string,"es_mio": boolean,"id": string,"nombre_negocio": string,"zona": string
            }[]
                           },
"conduce_ruta":
{ Args: { "rid": string }; Returns: boolean
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"hoy_madrid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mi_reparto":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"puede_registrar_parada":
{ Args: { "pid": string }; Returns: boolean
                           },
"puede_ver_cliente":
{ Args: { "cid": string }; Returns: boolean
                           },
"puede_ver_parada":
{ Args: { "pid": string }; Returns: boolean
                           },
"puede_ver_pedido":
{ Args: { "pid": string }; Returns: boolean
                           },
"puede_ver_visita":
{ Args: { "vid": string }; Returns: boolean
                           },
"registrar_entrega":
{ Args: { "p_datos": Json,"p_entrega": string,"p_estado": Database["public"]['Enums']["estado_parada"],"p_parada": string }; Returns: string
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"siguiente_estado":
{ Args: { "actual": Database["public"]['Enums']["estado_cliente"],"r": Database["public"]['Enums']["resultado_visita"] }; Returns: Database["public"]['Enums']["estado_cliente"]
                           }
          }
          Enums: {
            "canal_mensaje": "whatsapp"|"email","categoria_producto": "cerveza"|"refrescos"|"agua"|"vino"|"licores"|"cafe"|"alimentacion"|"limpieza_menaje","estado_cliente": "prospecto"|"interesado"|"cliente"|"perdido","estado_mensaje": "preparado"|"enviado"|"entregado"|"leido"|"respondido"|"fallido","estado_parada": "pendiente"|"entregada"|"fallida","estado_ruta": "planificada"|"en_curso"|"terminada","origen_consentimiento": "verbal_visita"|"formulario_papel"|"whatsapp"|"email"|"web","resultado_visita": "no_estaba"|"sin_interes"|"pide_info"|"interesado"|"pide_oferta"|"hace_pedido","rol_usuario": "admin"|"comercial","tipo_foto": "escaparate"|"barra"|"competencia"|"otra","tipo_negocio": "bar"|"restaurante"|"cafeteria"|"hotel"|"pub"|"catering"|"otro","tipo_visita": "puerta_fria"|"propaganda"|"seguimiento"|"degustacion"|"toma_pedido"|"incidencia"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "canal_mensaje": ["whatsapp", "email"],"categoria_producto": ["cerveza", "refrescos", "agua", "vino", "licores", "cafe", "alimentacion", "limpieza_menaje"],"estado_cliente": ["prospecto", "interesado", "cliente", "perdido"],"estado_mensaje": ["preparado", "enviado", "entregado", "leido", "respondido", "fallido"],"estado_parada": ["pendiente", "entregada", "fallida"],"estado_ruta": ["planificada", "en_curso", "terminada"],"origen_consentimiento": ["verbal_visita", "formulario_papel", "whatsapp", "email", "web"],"resultado_visita": ["no_estaba", "sin_interes", "pide_info", "interesado", "pide_oferta", "hace_pedido"],"rol_usuario": ["admin", "comercial"],"tipo_foto": ["escaparate", "barra", "competencia", "otra"],"tipo_negocio": ["bar", "restaurante", "cafeteria", "hotel", "pub", "catering", "otro"],"tipo_visita": ["puerta_fria", "propaganda", "seguimiento", "degustacion", "toma_pedido", "incidencia"]
          }
        }
} as const
