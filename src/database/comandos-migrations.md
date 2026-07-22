### Ejecutar archivos migrations (crear tablas faltantes)
``` 
npm run migration:run
```

### Generar migraciones a partir de entidades
```
npm run migration:generate -- name=create_user_table
```

### Para crear nuevos archivos
```
npm run migration:create -- name=nombre_nuevo_archivo
```

### Revertir
```
npm run migration:revert
```