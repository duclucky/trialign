"""Project-local compatibility shim for genlayer-test 0.29.2 on Windows.

The upstream direct loader unlinks its temporary stdin file immediately after
``dup2``. Windows keeps the path locked until fd 0 is restored, so deletion
must be deferred until the pytest session has released every VM context.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path


_DEFERRED_STDIN_FILES: list[Path] = []


if os.name == "nt":
    import gltest.direct.loader as direct_loader

    def _windows_inject_message_to_fd0(vm) -> None:
        from genlayer.py import calldata
        from genlayer.py.types import Address

        sender_addr = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
        contract_addr = (
            Address(vm._contract_address)
            if isinstance(vm._contract_address, bytes)
            else vm._contract_address
        )
        origin_addr = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
        message_data = {
            "contract_address": contract_addr,
            "sender_address": sender_addr,
            "origin_address": origin_addr,
            "stack": [],
            "value": vm._value,
            "datetime": vm._datetime,
            "is_init": False,
            "chain_id": vm._chain_id,
            "entry_kind": 0,
            "entry_data": b"",
            "entry_stage_data": None,
        }
        encoded = calldata.encode(message_data)
        fd, raw_path = tempfile.mkstemp(prefix="trialign-gltest-")
        path = Path(raw_path)
        try:
            os.write(fd, encoded)
            os.lseek(fd, 0, os.SEEK_SET)
            vm._original_stdin_fd = os.dup(0)
            os.dup2(fd, 0)
        finally:
            os.close(fd)
        _DEFERRED_STDIN_FILES.append(path)

    direct_loader._inject_message_to_fd0 = _windows_inject_message_to_fd0


def pytest_sessionfinish(session, exitstatus) -> None:
    del session, exitstatus
    for path in _DEFERRED_STDIN_FILES:
        try:
            path.unlink(missing_ok=True)
        except PermissionError:
            # Process teardown releases fd 0; a later run can remove stale
            # trialign-gltest-* files without affecting test correctness.
            pass
