import {
  Alert,
  List,
  ListItemButton,
  ListSubheader,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { useAnalyzeTrace } from "../../hooks/tauri-hooks";
import { AwardNavItem } from "./award-nav-item";
import { AWARD_SELECTOR_COLUMN_WIDTH, type AwardId, awards } from "./awards";
import { TitleSubtitle } from "./title-subtitle";

const DuplicatePackages = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();
  const duplicatePackages = analyzeTrace?.duplicatePackages ?? [];
  const Icon = awards.bundle_duplicatePackages.icon;
  const noneFound = (
    <Alert severity="success" sx={{ mx: 1 }}>
      No duplicate packages found.
      <br />
      <br />
      That's a good thing!
    </Alert>
  );

  const hasItems = duplicatePackages.length > 0;

  return (
    <Stack
      sx={{
        p: 1,
        pt: 2,
        gap: 2,
        ...(hasItems
          ? {}
          : { width: AWARD_SELECTOR_COLUMN_WIDTH, flexShrink: 0 }),
      }}
    >
      <TitleSubtitle
        title="Duplicate Packages"
        subtitle="Packages that are duplicated in the bundle.  TypeScript doesn't keep track of where these were included from, but at least now you know they're there."
        icon={<Icon fontSize="large" />}
      />

      {hasItems ? (
        <Stack gap={3}>
          {duplicatePackages.length > 0
            ? duplicatePackages.map(({ instances, name }) => (
                <Stack key={name}>
                  <Typography variant="h5" color="primary">
                    {name}
                  </Typography>

                  <List>
                    {instances.map(({ path, version }) => (
                      <ListItemButton
                        key={path}
                        sx={{
                          width: "100%",
                        }}
                      >
                        <Stack>
                          <Typography color="secondary">v{version}</Typography>
                          <Typography variant="caption" sx={{ mr: 2 }}>
                            {path}
                          </Typography>
                        </Stack>
                      </ListItemButton>
                    ))}
                  </List>
                </Stack>
              ))
            : noneFound}
        </Stack>
      ) : (
        noneFound
      )}
    </Stack>
  );
};

const bundleImplications = ["bundle_duplicatePackages"] satisfies AwardId[];
type BundleImplicationsAwardId = (typeof bundleImplications)[number];

const useBundleImplicationsValue = () => {
  const { data: analyzeTrace } = useAnalyzeTrace();

  return useCallback(
    (awardId: BundleImplicationsAwardId): number => {
      switch (awardId) {
        case "bundle_duplicatePackages": {
          const duplicatePackages = analyzeTrace?.duplicatePackages ?? [];
          return duplicatePackages.length;
        }
        default:
          awardId satisfies never;
          throw new Error(`Unknown award: ${awardId}`);
      }
    },
    [analyzeTrace],
  );
};

export const BundleImplicationsNavItems = () => {
  const getValue = useBundleImplicationsValue();

  return (
    <>
      <ListSubheader>Bundle Implications</ListSubheader>

      {bundleImplications.map(awardId => (
        <AwardNavItem
          key={awardId}
          awardId={awardId}
          value={getValue(awardId)}
        />
      ))}
    </>
  );
};

export const BundleImplicationsAward = ({
  awardId,
}: {
  awardId: BundleImplicationsAwardId;
}) => {
  if (awardId !== "bundle_duplicatePackages") {
    throw new Error(`Unknown award: ${awardId}`);
  }

  return <DuplicatePackages />;
};
