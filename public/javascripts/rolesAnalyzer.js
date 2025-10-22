document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1) load departments
    const depResp = await fetch("/roles/role-matrix"); // returns departments when no ?department
    const depData = await depResp.json();
    const depSelect = document.getElementById("depSelect");

    if (Array.isArray(depData.departments)) {
      depData.departments.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        depSelect.appendChild(opt);
      });
    }

    // when selection changes -> load matrix for department
    depSelect.addEventListener("change", () => {
      const selected = depSelect.value;
      if (!selected) {
        document.getElementById("rolesMatrix").innerHTML = "";
        return;
      }
      loadRoleMatrix(selected);
    });

    // optionally load default department if you want (uncomment)
    if (depSelect.options.length > 1) { depSelect.selectedIndex = 1; loadRoleMatrix(depSelect.value); }


  } catch (err) {
    console.error("Init error:", err);
  }
});

async function loadRoleMatrix(department) {
  try {
    const resp = await fetch(`/roles/role-matrix?department=${encodeURIComponent(department)}`);
    const data = await resp.json();

    // data.groups = array of group names (columns)
    // data.roles = array of { role: "Job Title", groups: [ "GroupA", ... ] }
    renderRoleUserMatrix(data.groups || [], data.roles || [], data.noJobTitleCount || 0, department);
  } catch (err) {
    console.error("Error loading role matrix:", err);
    document.getElementById("rolesMatrix").innerHTML = `<p>Error loading matrix.</p>`;
  }
}

function renderRoleUserMatrix(groups, roles, emptyJobCount, department) {
  const container = document.getElementById("rolesMatrix");
  container.innerHTML = "";

  const title = document.createElement("div");
  title.className = "matrix-header";
  title.innerHTML = `<strong>Department:</strong> ${department} &nbsp;&nbsp; <strong>Users w/o job title:</strong> ${emptyJobCount}`;
  container.appendChild(title);

  const scroll = document.createElement("div");
  scroll.className = "matrix-scroll";
  container.appendChild(scroll);

  const table = document.createElement("table");
  table.className = "matrix-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const firstTh = document.createElement("th");
  firstTh.textContent = "Role / User";
  headerRow.appendChild(firstTh);

  // Add group columns
  groups.forEach(g => {
    const th = document.createElement("th");
    th.textContent = g;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  // Roles (aggregated) as primary rows
  roles.forEach(roleEntry => {
    const tr = document.createElement("tr");
    tr.className = "role-row";
    tr.dataset.role = roleEntry.role;


    const roleCell = document.createElement("td");
    roleCell.className = "role-cell";
    roleCell.innerHTML = `<span class="caret">▸</span> ${escapeHtml(roleEntry.role)} <span class="group-count">(X members)</span><span class="group-count">(${roleEntry.groups.length} groups)</span>`;
    tr.appendChild(roleCell);

    groups.forEach(groupName => {
      const td = document.createElement("td");
      td.className = "matrix-cell";
      td.textContent = roleEntry.groups.includes(groupName) ? "✔️" : "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  scroll.appendChild(table);

  // Click handler - delegate on tbody
  tbody.addEventListener("click", async (ev) => {
    const roleRow = ev.target.closest(".role-row");
    if (!roleRow) return;

    const roleName = roleRow.dataset.role;
    const caret = roleRow.querySelector(".caret");

    // If already expanded: remove following user rows belonging to this role
    if (roleRow.dataset.expanded === "true") {
      collapseUsersUnderRole(roleRow);
      roleRow.dataset.expanded = "false";
      if (caret) caret.textContent = "▸";
      return;
    }

    // otherwise expand: fetch users and insert user rows immediately after roleRow
    roleRow.dataset.expanded = "true";
    if (caret) caret.textContent = "▾";

    // avoid duplicate expansions - remove any previous user rows for this role
    collapseUsersUnderRole(roleRow);

    // indicate loading row
    const loadingTr = document.createElement("tr");
    loadingTr.className = "user-row loading";
    const loadingTd = document.createElement("td");
    loadingTd.colSpan = groups.length + 1;
    loadingTd.textContent = "Loading users...";
    loadingTr.appendChild(loadingTd);
    roleRow.after(loadingTr);

    try {
      const r = await fetch(`/roles/role-users/${encodeURIComponent(roleName)}`);
      const users = await r.json();

      // remove loading placeholder
      loadingTr.remove();

      if (!Array.isArray(users) || users.length === 0) {
        const emptyTr = document.createElement("tr");
        emptyTr.className = "user-row empty";
        const td = document.createElement("td");
        td.colSpan = groups.length + 1;
        td.textContent = `No users with role "${roleName}" found.`;
        emptyTr.appendChild(td);
        roleRow.after(emptyTr);
        return;
      }

      // insert a row per user, right after the roleRow (in order)
      let insertAfter = roleRow;
      users.forEach(u => {
        const utr = document.createElement("tr");
        utr.className = "user-row";
        utr.dataset.parentRole = roleName;

        const nameTd = document.createElement("td");
        nameTd.className = "user-cell";
        nameTd.textContent = `${u.displayName} (${u.groups.length} groups)`;
        utr.appendChild(nameTd);

        groups.forEach(g => {
          const gtd = document.createElement("td");
          gtd.className = "matrix-cell";
          gtd.textContent = Array.isArray(u.groups) && u.groups.includes(g) ? "✔️" : "";
          utr.appendChild(gtd);
        });

        insertAfter.after(utr);
        insertAfter = utr;
      });

    } catch (err) {
      console.error("Error fetching users for role", roleName, err);
      loadingTr.remove();
      const errTr = document.createElement("tr");
      errTr.className = "user-row error";
      const td = document.createElement("td");
      td.colSpan = groups.length + 1;
      td.textContent = "Error loading users for this role.";
      errTr.appendChild(td);
      roleRow.after(errTr);
    }
  });

  // attach to DOM
  container.appendChild(scroll);
}

// remove user rows directly following a role row that belong to that role
function collapseUsersUnderRole(roleRow) {
  let next = roleRow.nextElementSibling;
  while (next && next.classList.contains("user-row")) {
    const pr = next.dataset.parentRole;
    if (!pr || pr !== roleRow.dataset.role) break; // stop if not the same role
    const toRemove = next;
    next = next.nextElementSibling;
    toRemove.remove();
  }
}

// small helper - escape text inserted into innerHTML context
function escapeHtml(text){
  if (text == null) return "";
  return String(text).replace(/[&<>"'`=\/]/g, function(s){ return ({ '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=':'&#x3D;' })[s]; });
}
// Example output:
// | Role | Group 1 | Group 2 | Group 3 | … |
// |------|----------|----------|----------|    