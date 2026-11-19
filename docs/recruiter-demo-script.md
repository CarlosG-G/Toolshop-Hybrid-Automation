# Recruiter walkthrough script

**Target length:** 60–90 seconds

**Narration:** Spanish

**Subtitles:** English

**Recording:** Use the live dashboard and repository pages; this file is a
script, not a recorded demo.

1. **Dashboard**

   **ES:** Este proyecto muestra cómo convierto un riesgo de negocio en evidencia
   de calidad que se puede revisar. Automatizo una tienda de demostración con
   pruebas de API, interfaz, contrato y flujos de navegador.

   **EN:** This project shows how I turn a business risk into reviewable quality
   evidence. I automate a demo shop with API, UI, contract and browser-flow tests.

2. **Dashboard result categories**

   **ES:** El resultado separa fallos inesperados de defectos conocidos,
   reintentos y casos omitidos. Un resultado verde no oculta qué se probó ni qué
   queda pendiente.

   **EN:** The result separates unexpected failures from known defects, retries
   and skipped cases. A green result does not hide what was tested or what remains.

3. **DEF-007 case study**

   **ES:** Un ejemplo es el registro el día exacto en que una persona cumple
   18 años. La regla permite edades de 18 a 75, pero la API rechazaba ese límite
   con un 422.

   **EN:** One example is registration on a customer's 18th birthday. The rule
   allows ages 18 to 75, but the API rejected that boundary with a 422.

4. **API test and CI evidence**

   **ES:** TC-API-068 aplica análisis de valores límite; TC-API-069 protege el
   límite de 75 años. El hallazgo queda enlazado al requisito, al issue y a la
   ejecución de CI.

   **EN:** TC-API-068 applies boundary value analysis; TC-API-069 protects the
   75-year limit. The finding links to its requirement, issue and CI run.

5. **Safety boundary**

   **ES:** Las operaciones que escriben datos y las pruebas de carga o seguridad
   se ejecutan solo contra un entorno local desechable. El sitio público se
   consulta en modo de solo lectura.

   **EN:** Data-writing operations and load or security tests run only against a
   disposable local environment. Public-site checks are read-only.

6. **Closing**

   **ES:** El objetivo es que cada resultado tenga contexto, evidencia y un
   siguiente paso claro.

   **EN:** The goal is for every result to have context, evidence and a clear
   next step.

**Suggested screen sequence:** dashboard verdict and result categories → the
DEF-007 case study → TC-API-068/069 → the linked issue and CI evidence.
